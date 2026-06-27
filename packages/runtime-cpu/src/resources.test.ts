import { describe, expect, it } from 'vitest';
import {
	createCpuResourceResolver,
	fftBandMagnitude,
	readMeshAttribute,
	sampleImagePixel,
	type AudioCpuView,
	type ImageCpuView,
	type MeshCpuView,
} from './resources.js';

describe('@virtual-planet/runtime-cpu resources', () => {
	it('samples and normalizes a known RGBA8 pixel', () => {
		const image: ImageCpuView = {
			kind: 'image',
			width: 2,
			height: 1,
			channels: 4,
			data: new Uint8Array([0, 0, 0, 0, 255, 128, 64, 255]),
		};
		expect(sampleImagePixel(image, 1, 0)).toEqual([1, 128 / 255, 64 / 255, 1]);
	});

	it('fills missing image channels with zero RGB and opaque alpha', () => {
		const image: ImageCpuView = {
			kind: 'image',
			width: 1,
			height: 1,
			channels: 1,
			data: new Float32Array([0.25]),
		};
		expect(sampleImagePixel(image, 0, 0)).toEqual([0.25, 0, 0, 1]);
	});

	it('reads a mesh attribute for a selected vertex', () => {
		const mesh: MeshCpuView = {
			kind: 'mesh',
			vertexCount: 2,
			attributes: {
				position: {
					size: 3,
					data: new Float32Array([1, 2, 3, 4, 5, 6]),
				},
			},
		};
		expect(readMeshAttribute(mesh, 'position', 1)).toEqual([4, 5, 6]);
	});

	it('reports unit magnitude for a bin-centered sine', () => {
		const samples = Float32Array.from(
			{ length: 8 },
			(_, frame) => Math.sin(2 * Math.PI * frame / 8),
		);
		const audio: AudioCpuView = {
			kind: 'audio',
			sampleRate: 8,
			channelCount: 1,
			samples,
		};
		expect(fftBandMagnitude(audio, 1, { fftSize: 8 })).toBeCloseTo(1, 6);
	});

	it('resolves bound resources and enforces their declared kind', () => {
		const image: ImageCpuView = {
			kind: 'image',
			width: 1,
			height: 1,
			channels: 4,
			data: new Uint8Array(4),
		};
		const resolver = createCpuResourceResolver([{ id: 'mask', view: image }]);

		expect(resolver.resolve({ id: 'mask', type: 'image' })).toBe(image);
		expect(resolver.resolve({ id: 'missing', type: 'image' })).toBeUndefined();
		expect(() => resolver.resolve({ id: 'mask', type: 'mesh' })).toThrow(TypeError);
	});

	it('rejects representative invalid layouts and bounds', () => {
		const badImage: ImageCpuView = {
			kind: 'image',
			width: 1,
			height: 1,
			channels: 4,
			data: new Uint8Array(3),
		};
		expect(() => sampleImagePixel(badImage, 0, 0)).toThrow(RangeError);
		const validImage: ImageCpuView = {
			...badImage,
			data: new Uint8Array(4),
		};
		expect(() => sampleImagePixel(validImage, 1, 0)).toThrow(RangeError);

		const mesh: MeshCpuView = {
			kind: 'mesh',
			vertexCount: 2,
			attributes: { position: { size: 3, data: new Float32Array(3) } },
		};
		expect(() => readMeshAttribute(mesh, 'position', 1)).toThrow(RangeError);
		expect(() => readMeshAttribute({ ...mesh, vertexCount: 1 }, 'missing', 0)).toThrow(Error);
		const validMesh: MeshCpuView = {
			...mesh,
			attributes: { position: { size: 3, data: new Float32Array(6) } },
		};
		expect(() => readMeshAttribute(validMesh, 'position', 2)).toThrow(RangeError);

		const audio: AudioCpuView = {
			kind: 'audio',
			sampleRate: 8,
			channelCount: 2,
			samples: new Float32Array(3),
		};
		expect(() => fftBandMagnitude(audio, 1, { fftSize: 2 })).toThrow(RangeError);
		const validAudio: AudioCpuView = {
			...audio,
			channelCount: 1,
			samples: new Float32Array(8),
		};
		expect(() => fftBandMagnitude(validAudio, 5, { fftSize: 8 })).toThrow(RangeError);
		expect(() => fftBandMagnitude(validAudio, 1, { fftSize: 8, startFrame: 1 })).toThrow(RangeError);
	});

	it('rejects duplicate resolver bindings', () => {
		const view: ImageCpuView = {
			kind: 'image',
			width: 1,
			height: 1,
			channels: 1,
			data: new Uint8Array(1),
		};
		expect(() => createCpuResourceResolver([
			{ id: 'duplicate', view },
			{ id: 'duplicate', view },
		])).toThrow(Error);
	});
});
