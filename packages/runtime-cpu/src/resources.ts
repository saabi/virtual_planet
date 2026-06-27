import type { ResourceDataType, ResourceDependency } from '@virtual-planet/graph';

export type ImageChannelCount = 1 | 2 | 3 | 4;
export type ImagePixelData = Uint8Array | Float32Array;
export type Pixel = readonly [number, number, number, number];

export interface ImageCpuView {
	kind: 'image';
	width: number;
	height: number;
	channels: ImageChannelCount;
	data: ImagePixelData;
}

function validInteger(value: number, minimum: number): boolean {
	return Number.isInteger(value) && value >= minimum;
}

function validateImage(image: ImageCpuView): void {
	if (
		!validInteger(image.width, 1)
		|| !validInteger(image.height, 1)
		|| !validInteger(image.channels, 1)
		|| image.channels > 4
		|| image.data.length !== image.width * image.height * image.channels
	) {
		throw new RangeError('Invalid image layout');
	}
}

export function sampleImagePixel(image: ImageCpuView, x: number, y: number): Pixel {
	validateImage(image);
	if (!validInteger(x, 0) || !validInteger(y, 0) || x >= image.width || y >= image.height) {
		throw new RangeError('Image coordinates are out of bounds');
	}

	const offset = (y * image.width + x) * image.channels;
	const scale = image.data instanceof Uint8Array ? 1 / 255 : 1;
	return [
		image.data[offset] * scale,
		image.channels >= 2 ? image.data[offset + 1] * scale : 0,
		image.channels >= 3 ? image.data[offset + 2] * scale : 0,
		image.channels >= 4 ? image.data[offset + 3] * scale : 1,
	];
}

export type MeshAttributeSize = 1 | 2 | 3 | 4;

export interface MeshAttributeCpuView {
	size: MeshAttributeSize;
	data: Float32Array;
}

export interface MeshCpuView {
	kind: 'mesh';
	vertexCount: number;
	attributes: Readonly<Record<string, MeshAttributeCpuView>>;
	indices?: Uint16Array | Uint32Array;
}

export function readMeshAttribute(
	mesh: MeshCpuView,
	name: string,
	vertexIndex: number,
): number[] {
	if (!validInteger(mesh.vertexCount, 0) || !validInteger(vertexIndex, 0) || vertexIndex >= mesh.vertexCount) {
		throw new RangeError('Invalid mesh vertex count or index');
	}

	const attribute = mesh.attributes[name];
	if (!attribute) {
		throw new Error(`Unknown mesh attribute: ${name}`);
	}
	if (
		!validInteger(attribute.size, 1)
		|| attribute.size > 4
		|| attribute.data.length !== mesh.vertexCount * attribute.size
	) {
		throw new RangeError(`Invalid mesh attribute layout: ${name}`);
	}

	const offset = vertexIndex * attribute.size;
	return Array.from(attribute.data.subarray(offset, offset + attribute.size));
}

export interface AudioCpuView {
	kind: 'audio';
	sampleRate: number;
	channelCount: number;
	samples: Float32Array;
}

export interface FftBandOptions {
	fftSize: number;
	channel?: number;
	startFrame?: number;
}

export function fftBandMagnitude(
	audio: AudioCpuView,
	bandIndex: number,
	options: FftBandOptions,
): number {
	const { fftSize } = options;
	const channel = options.channel ?? 0;
	const startFrame = options.startFrame ?? 0;

	if (
		!Number.isFinite(audio.sampleRate)
		|| audio.sampleRate <= 0
		|| !validInteger(audio.channelCount, 1)
		|| audio.samples.length % audio.channelCount !== 0
		|| !validInteger(fftSize, 1)
		|| !validInteger(channel, 0)
		|| channel >= audio.channelCount
		|| !validInteger(startFrame, 0)
		|| startFrame + fftSize > audio.samples.length / audio.channelCount
		|| !validInteger(bandIndex, 0)
		|| bandIndex > Math.floor(fftSize / 2)
	) {
		throw new RangeError('Invalid audio layout or FFT selection');
	}

	let real = 0;
	let imaginary = 0;
	for (let frame = 0; frame < fftSize; frame += 1) {
		const sample = audio.samples[(startFrame + frame) * audio.channelCount + channel];
		const angle = 2 * Math.PI * bandIndex * frame / fftSize;
		real += sample * Math.cos(angle);
		imaginary -= sample * Math.sin(angle);
	}

	const isNyquist = fftSize % 2 === 0 && bandIndex === fftSize / 2;
	const scale = bandIndex === 0 || isNyquist ? 1 / fftSize : 2 / fftSize;
	return Math.hypot(real, imaginary) * scale;
}

export type CpuResourceView = ImageCpuView | MeshCpuView | AudioCpuView;

export interface CpuResourceResolver {
	resolve(dependency: ResourceDependency): CpuResourceView | undefined;
}

export interface CpuResourceBinding {
	id: string;
	view: CpuResourceView;
}

export function createCpuResourceResolver(
	bindings: readonly CpuResourceBinding[],
): CpuResourceResolver {
	const views = new Map<string, CpuResourceView>();
	for (const binding of bindings) {
		if (views.has(binding.id)) {
			throw new Error(`Duplicate resource binding: ${binding.id}`);
		}
		views.set(binding.id, binding.view);
	}

	return {
		resolve(dependency) {
			const view = views.get(dependency.id);
			if (!view) return undefined;
			const kind: ResourceDataType = view.kind;
			if (kind !== dependency.type) {
				throw new TypeError(
					`Resource kind mismatch for ${dependency.id}: expected ${dependency.type}, got ${kind}`,
				);
			}
			return view;
		},
	};
}
