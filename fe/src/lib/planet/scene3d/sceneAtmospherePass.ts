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
import type { CameraState } from '../camera/cameraModes.js';
import type { SceneOverlayCompositeMode } from './sceneEngine.js';

// Atmosphere composite for the shared scene pass (Phase 5). Runs after the spheres+terrain
// pass and alpha-blends the focused body's atmosphere over the scene color. The selected
// body's terrain pass writes a linear surface-distance texture for the march end, while
// shared scene depth remains the foreground occlusion source for moons and other bodies.
// See gpu/wgsl/scene3d/sceneAtmosphere.wgsl.

const FRAME_SIZE = 256; // invVP(64) + VP(64) + cameraPos(16) + viewport(16) + debug(16), padded

export interface SceneAtmosphereInput {
	/** inverse(viewProjection) of the focused-body (body-local) camera. */
	invViewProjection: Float32Array;
	/** viewProjection of the focused-body (body-local) camera, depth-identical to scene. */
	viewProjection: Float32Array;
	/** Focused-body camera used by terrain; supplies eye, mode, altitude, and focal length. */
	camera: CameraState;
	atmosphere: GpuAtmosphereParams;
	lighting: LightingUniforms;
	materialOverrides: MaterialOverrides;
	width: number;
	height: number;
	/** Scene atmosphere debug mode encoded for sceneAtmosphere.wgsl. */
	debugMode: number;
	/** LOD cross-fade opacity for normal atmosphere compositing. */
	atmosphereOpacity: number;
}

export class SceneAtmospherePass {
	private device: GPUDevice;
	private explicitPipeline: GPURenderPipeline;
	private alphaPipeline: GPURenderPipeline;
	private frameBuffer: GPUBuffer;
	private lightingBuffer: GPUBuffer;
	private materialBuffer: GPUBuffer;
	private atmosphereBuffer: GPUBuffer;

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
		this.atmosphereBuffer = device.createBuffer({ size: ATMOSPHERE_UNIFORM_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
	}

	record(
		pass: GPURenderPassEncoder,
		sceneColorView: GPUTextureView | null,
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
		view.setFloat32(128, input.camera.position[0], true);
		view.setFloat32(132, input.camera.position[1], true);
		view.setFloat32(136, input.camera.position[2], true);
		view.setFloat32(140, 1, true);
		view.setFloat32(144, input.width, true);
		view.setFloat32(148, input.height, true);
		view.setFloat32(160, input.debugMode, true);
		view.setFloat32(164, input.atmosphereOpacity, true);
		this.device.queue.writeBuffer(this.frameBuffer, 0, frame);

		const lightingStaging = new ArrayBuffer(LIGHTING_UNIFORM_SIZE);
		writeLightingUniforms(lightingStaging, input.lighting);
		this.device.queue.writeBuffer(this.lightingBuffer, 0, lightingStaging);

		const matStaging = new ArrayBuffer(MATERIAL_OVERRIDES_UNIFORM_SIZE);
		writeMaterialOverrides(matStaging, input.materialOverrides);
		this.device.queue.writeBuffer(this.materialBuffer, 0, matStaging);

		const atmoStaging = new ArrayBuffer(ATMOSPHERE_UNIFORM_SIZE);
		writeAtmosphereParamsToBuffer(atmoStaging, 0, input.atmosphere);
		this.device.queue.writeBuffer(this.atmosphereBuffer, 0, atmoStaging);

		const frameBg = this.device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.frameBuffer } },
				{ binding: 1, resource: { buffer: this.lightingBuffer } },
				{ binding: 2, resource: { buffer: this.materialBuffer } },
				{ binding: 3, resource: { buffer: this.atmosphereBuffer } }
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
							{ binding: 0, resource: sceneColorView! },
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
		this.atmosphereBuffer.destroy();
	}
}
