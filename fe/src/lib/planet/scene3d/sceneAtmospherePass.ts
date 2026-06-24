import sceneAtmosphereShader from '../gpu/wgsl/scene3d/sceneAtmosphere.wgsl';
import {
	ATMOSPHERE_UNIFORM_SIZE,
	LIGHTING_UNIFORM_SIZE,
	writeLightingUniforms,
	type LightingUniforms
} from '../render/uniformLayouts.js';
import { MATERIAL_OVERRIDES_UNIFORM_SIZE, writeMaterialOverrides } from '../render/materialOverrides.js';
import { writeAtmosphereParamsToBuffer, type GpuAtmosphereParams } from '../params/atmosphereParams.js';
import type { MaterialOverrides } from '../material/biomes.js';
import type { SceneOverlayCompositeMode } from './sceneEngine.js';
import { MAX_PROCEDURAL_BODIES } from './proceduralBodies.js';

// Scene atmosphere composite for the shared scene pass. One fullscreen pass composites
// every procedural body's halo using the scene camera and camera-relative body centers.
// See gpu/wgsl/scene3d/sceneAtmosphere.wgsl.

const FRAME_SIZE = 256; // invVP(64) + VP(64) + cameraPos(16) + viewport(16) + debug(16), padded
/** Header (16) + opacity[8] (32) + bodies[N] — must match sceneAtmosphere.wgsl SceneAtmosphereSet. */
export const SCENE_ATMOSPHERE_OPACITY_OFFSET = 16;
export const SCENE_ATMOSPHERE_BODIES_OFFSET = 48;
const ATMOSPHERE_SET_SIZE =
	SCENE_ATMOSPHERE_BODIES_OFFSET + MAX_PROCEDURAL_BODIES * ATMOSPHERE_UNIFORM_SIZE;

export interface SceneAtmosphereBody {
	atmosphere: GpuAtmosphereParams;
	/** LOD cross-fade opacity for this body (0..1). */
	opacity: number;
}

export interface SceneAtmosphereInput {
	/** inverse(viewProjection) of the scene camera. */
	invViewProjection: Float32Array;
	/** viewProjection of the scene camera (matches the geometry pass). */
	viewProjection: Float32Array;
	/** Scene camera eye in world space (body centers are relative to this). */
	cameraWorldPos: [number, number, number];
	bodies: SceneAtmosphereBody[];
	lighting: LightingUniforms;
	materialOverrides: MaterialOverrides;
	width: number;
	height: number;
	/** Scene atmosphere debug mode encoded for sceneAtmosphere.wgsl. */
	debugMode: number;
}

export class SceneAtmospherePass {
	private device: GPUDevice;
	private explicitPipeline: GPURenderPipeline;
	private alphaPipeline: GPURenderPipeline;
	private frameBuffer: GPUBuffer;
	private lightingBuffer: GPUBuffer;
	private materialBuffer: GPUBuffer;
	private atmosphereSetBuffer: GPUBuffer;

	constructor(device: GPUDevice, format: GPUTextureFormat) {
		this.device = device;
		const module = device.createShaderModule({ code: sceneAtmosphereShader });
		this.explicitPipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: {
				module,
				entryPoint: 'fs_explicit',
				targets: [{ format }]
			},
			primitive: { topology: 'triangle-list' }
		});
		this.alphaPipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: {
				module,
				entryPoint: 'fs_alpha',
				targets: [
					{
						format,
						blend: {
							color: {
								srcFactor: 'one',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							},
							alpha: {
								srcFactor: 'one',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							}
						}
					}
				]
			},
			primitive: { topology: 'triangle-list' }
		});
		this.frameBuffer = device.createBuffer({ size: FRAME_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		this.lightingBuffer = device.createBuffer({ size: LIGHTING_UNIFORM_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		this.materialBuffer = device.createBuffer({ size: MATERIAL_OVERRIDES_UNIFORM_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		this.atmosphereSetBuffer = device.createBuffer({
			size: ATMOSPHERE_SET_SIZE,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
	}

	record(
		pass: GPURenderPassEncoder,
		compositeSourceView: GPUTextureView | null,
		depthView: GPUTextureView,
		surfaceDistanceView: GPUTextureView,
		input: SceneAtmosphereInput,
		mode: SceneOverlayCompositeMode = 'explicit-composite'
	) {
		const pipeline = mode === 'hardware-alpha' ? this.alphaPipeline : this.explicitPipeline;
		const frame = new ArrayBuffer(FRAME_SIZE);
		const view = new DataView(frame);
		for (let i = 0; i < 16; i++) view.setFloat32(i * 4, input.invViewProjection[i], true);
		for (let i = 0; i < 16; i++) view.setFloat32(64 + i * 4, input.viewProjection[i], true);
		view.setFloat32(128, input.cameraWorldPos[0], true);
		view.setFloat32(132, input.cameraWorldPos[1], true);
		view.setFloat32(136, input.cameraWorldPos[2], true);
		view.setFloat32(140, 1, true);
		view.setFloat32(144, input.width, true);
		view.setFloat32(148, input.height, true);
		view.setFloat32(160, input.debugMode, true);
		view.setFloat32(164, 0, true);
		this.device.queue.writeBuffer(this.frameBuffer, 0, frame);

		const lightingStaging = new ArrayBuffer(LIGHTING_UNIFORM_SIZE);
		writeLightingUniforms(lightingStaging, input.lighting);
		this.device.queue.writeBuffer(this.lightingBuffer, 0, lightingStaging);

		const matStaging = new ArrayBuffer(MATERIAL_OVERRIDES_UNIFORM_SIZE);
		writeMaterialOverrides(matStaging, input.materialOverrides);
		this.device.queue.writeBuffer(this.materialBuffer, 0, matStaging);

		const bodyCount = Math.min(input.bodies.length, MAX_PROCEDURAL_BODIES);
		const setStaging = new ArrayBuffer(ATMOSPHERE_SET_SIZE);
		const setView = new DataView(setStaging);
		setView.setUint32(0, bodyCount, true);
		for (let i = 0; i < MAX_PROCEDURAL_BODIES; i++) {
			setView.setFloat32(SCENE_ATMOSPHERE_OPACITY_OFFSET + i * 4, input.bodies[i]?.opacity ?? 0, true);
			const body = input.bodies[i];
			if (body) {
				writeAtmosphereParamsToBuffer(
					setStaging,
					SCENE_ATMOSPHERE_BODIES_OFFSET + i * ATMOSPHERE_UNIFORM_SIZE,
					body.atmosphere
				);
			}
		}
		this.device.queue.writeBuffer(this.atmosphereSetBuffer, 0, setStaging);

		const frameBg = this.device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.frameBuffer } },
				{ binding: 1, resource: { buffer: this.lightingBuffer } },
				{ binding: 2, resource: { buffer: this.materialBuffer } },
				{ binding: 3, resource: { buffer: this.atmosphereSetBuffer } }
			]
		});
		const sceneBg =
			mode === 'hardware-alpha'
				? this.device.createBindGroup({
						layout: pipeline.getBindGroupLayout(1),
						entries: [
							{ binding: 1, resource: depthView },
							{ binding: 2, resource: surfaceDistanceView }
						]
					})
				: this.device.createBindGroup({
						layout: pipeline.getBindGroupLayout(1),
						entries: [
							{ binding: 0, resource: compositeSourceView! },
							{ binding: 1, resource: depthView },
							{ binding: 2, resource: surfaceDistanceView }
						]
					});
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, frameBg);
		pass.setBindGroup(1, sceneBg);
		pass.draw(3);
	}

	destroy() {
		this.frameBuffer.destroy();
		this.lightingBuffer.destroy();
		this.materialBuffer.destroy();
		this.atmosphereSetBuffer.destroy();
	}
}
