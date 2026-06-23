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
import type { Vec3 } from '../math/vec.js';

// Atmosphere composite for the shared scene pass (Phase 5). Runs after the spheres+terrain
// pass; reads the scene depth (for occlusion / march length) and alpha-blends the focused
// body's atmosphere over the scene color. See gpu/wgsl/scene3d/sceneAtmosphere.wgsl.

const FRAME_SIZE = 256; // invVP(64) + cameraPos(16) + viewport(16), padded

export interface SceneAtmosphereInput {
	/** inverse(viewProjection) of the focused-body (body-local) camera. */
	invViewProjection: Float32Array;
	/** That camera's eye position (body-local). */
	cameraPos: Vec3;
	atmosphere: GpuAtmosphereParams;
	lighting: LightingUniforms;
	materialOverrides: MaterialOverrides;
	width: number;
	height: number;
}

export class SceneAtmospherePass {
	private device: GPUDevice;
	private pipeline: GPURenderPipeline;
	private frameBuffer: GPUBuffer;
	private lightingBuffer: GPUBuffer;
	private materialBuffer: GPUBuffer;
	private atmosphereBuffer: GPUBuffer;

	constructor(device: GPUDevice, format: GPUTextureFormat) {
		this.device = device;
		const module = device.createShaderModule({ code: sceneAtmosphereShader });
		this.pipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [
					{
						format,
						// result = inscatter + sceneColor * avgTransmittance (alpha = 1 - avgT).
						blend: {
							color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
							alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
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

	record(pass: GPURenderPassEncoder, depthView: GPUTextureView, input: SceneAtmosphereInput) {
		const frame = new ArrayBuffer(FRAME_SIZE);
		const view = new DataView(frame);
		for (let i = 0; i < 16; i++) view.setFloat32(i * 4, input.invViewProjection[i], true);
		view.setFloat32(64, input.cameraPos[0], true);
		view.setFloat32(68, input.cameraPos[1], true);
		view.setFloat32(72, input.cameraPos[2], true);
		view.setFloat32(76, 1, true);
		view.setFloat32(80, input.width, true);
		view.setFloat32(84, input.height, true);
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
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.frameBuffer } },
				{ binding: 1, resource: { buffer: this.lightingBuffer } },
				{ binding: 2, resource: { buffer: this.materialBuffer } },
				{ binding: 3, resource: { buffer: this.atmosphereBuffer } }
			]
		});
		const sceneBg = this.device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(1),
			entries: [{ binding: 0, resource: depthView }]
		});

		pass.setPipeline(this.pipeline);
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
