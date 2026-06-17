import cubeSphereShader from '../../gpu/wgsl/terrain/cubeSphereVertex.wgsl';
import surfacePatchShader from '../../gpu/wgsl/terrain/surfacePatchVertex.wgsl';
import {
	createLocalFrameBuffer,
	createPlanetParamsBuffer,
	createScaleContextBuffer,
	uploadPlanetParams,
	writeLocalFrameToBuffer,
	writeScaleContextToBuffer,
	writeCubeSpherePatchesToBuffer,
	writeSurfacePatchesToBuffer
} from '../../params/gpuBuffers.js';
import {
	renderModeToGpu,
	toGpuPlanetParams,
	type GpuLocalFrame,
	type GpuScaleContext
} from '../../params/planetParams.js';
import { buildScaleContext, gatedParams } from '../../planet/layers.js';
import { BIND_GROUP, UNIFORM_ALIGN, writeViewUniforms, type ViewUniforms } from '../uniformLayouts.js';
import type { RenderFrame, RenderStats } from '../RenderBackend.js';
import { cubePatchVertexCount } from '../../patches/cubeSphere.js';

export const VERTS_PER_PATCH = 6; // legacy minimum; cube draws use cubePatchVertexCount(resolution)

export class TerrainPass {
	readonly cubePipeline: GPURenderPipeline;
	readonly surfacePipeline: GPURenderPipeline;
	readonly viewBuffer: GPUBuffer;
	readonly planetBuffer: GPUBuffer;
	readonly scaleBuffer: GPUBuffer;
	readonly localFrameBuffer: GPUBuffer;
	depthTexture: GPUTexture | null = null;
	depthView: GPUTextureView | null = null;
	cubePatchBuffer: GPUBuffer | null = null;
	surfacePatchBuffer: GPUBuffer | null = null;
	cubePatchCount = 0;
	surfacePatchCount = 0;

	constructor(
		private readonly device: GPUDevice,
		readonly format: GPUTextureFormat
	) {
		this.viewBuffer = device.createBuffer({
			size: UNIFORM_ALIGN,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		this.planetBuffer = createPlanetParamsBuffer(device);
		this.scaleBuffer = createScaleContextBuffer(device);
		this.localFrameBuffer = createLocalFrameBuffer(device);

		const cubeLayout = this.createCubeLayout();
		const surfaceLayout = this.createSurfaceLayout();

		const cubeModule = device.createShaderModule({ code: cubeSphereShader });
		const surfaceModule = device.createShaderModule({ code: surfacePatchShader });

		this.cubePipeline = this.createPipeline(cubeLayout, cubeModule);
		this.surfacePipeline = this.createPipeline(surfaceLayout, surfaceModule);
	}

	private createCubeLayout(): GPUPipelineLayout {
		return this.device.createPipelineLayout({
			bindGroupLayouts: [
				this.uniformBgl(),
				this.uniformBgl(),
				this.uniformBgl(),
				this.storageBgl()
			]
		});
	}

	private createSurfaceLayout(): GPUPipelineLayout {
		return this.device.createPipelineLayout({
			bindGroupLayouts: [
				this.uniformBgl(),
				this.uniformBgl(),
				this.scaleAndLocalFrameBgl(),
				this.storageBgl()
			]
		});
	}

	private scaleAndLocalFrameBgl(): GPUBindGroupLayout {
		return this.device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: { type: 'uniform' }
				},
				{
					binding: 1,
					visibility: GPUShaderStage.VERTEX,
					buffer: { type: 'uniform' }
				}
			]
		});
	}

	private uniformBgl(): GPUBindGroupLayout {
		return this.device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: { type: 'uniform' }
				}
			]
		});
	}

	private storageBgl(): GPUBindGroupLayout {
		return this.device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: { type: 'read-only-storage' }
				}
			]
		});
	}

	private createPipeline(layout: GPUPipelineLayout, module: GPUShaderModule): GPURenderPipeline {
		return this.device.createRenderPipeline({
			layout,
			vertex: { module, entryPoint: 'vs_main' },
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{ format: this.format }]
			},
			primitive: { topology: 'triangle-list', cullMode: 'back' },
			depthStencil: {
				format: 'depth24plus',
				depthWriteEnabled: true,
				depthCompare: 'less'
			}
		});
	}

	ensureDepth(width: number, height: number): void {
		if (this.depthTexture?.width === width && this.depthTexture?.height === height) return;
		this.depthTexture?.destroy();
		this.depthTexture = this.device.createTexture({
			size: [Math.max(1, width), Math.max(1, height)],
			format: 'depth24plus',
			usage: GPUTextureUsage.RENDER_ATTACHMENT
		});
		this.depthView = this.depthTexture.createView();
	}

	updatePatches(frame: RenderFrame): void {
		this.cubePatchBuffer?.destroy();
		this.surfacePatchBuffer?.destroy();
		this.cubePatchCount = frame.cubeSpherePatches.length;
		this.surfacePatchCount = frame.surfacePatches.length;
		if (this.cubePatchCount > 0) {
			this.cubePatchBuffer = writeCubeSpherePatchesToBuffer(frame.cubeSpherePatches, this.device);
		} else {
			this.cubePatchBuffer = null;
		}
		if (this.surfacePatchCount > 0) {
			this.surfacePatchBuffer = writeSurfacePatchesToBuffer(frame.surfacePatches, this.device);
		} else {
			this.surfacePatchBuffer = null;
		}
	}

	uploadUniforms(frame: RenderFrame): void {
		const viewStaging = new ArrayBuffer(UNIFORM_ALIGN);
		const viewUniforms: ViewUniforms = {
			viewProjection: frame.camera.viewProjectionMatrix,
			view: frame.camera.viewMatrix,
			cameraPos: [frame.camera.position[0], frame.camera.position[1], frame.camera.position[2], 1],
			debug: [
				frame.debug.wireframe ? 1 : 0,
				frame.debug.faceColors ? 1 : 0,
				frame.debug.showPatchBorders ? 1 : 0,
				frame.debug.showRingColors ? 1 : 0
			]
		};
		writeViewUniforms(viewStaging, viewUniforms);
		this.device.queue.writeBuffer(this.viewBuffer, 0, viewStaging);
		const dist = Math.hypot(...frame.camera.position);
		const scaleCtx = buildScaleContext(
			frame.camera.mode,
			frame.camera.altitudeMeters,
			dist,
			frame.camera.focalLengthPx,
			frame.viewportHeightPx
		);
		const gated = gatedParams(frame.params, scaleCtx);
		uploadPlanetParams(this.device, this.planetBuffer, toGpuPlanetParams(gated, frame.time));

		const scale: GpuScaleContext = {
			camera_altitude_meters: scaleCtx.cameraAltitudeMeters,
			distance_to_camera_meters: scaleCtx.distanceToCameraMeters,
			meters_per_pixel: scaleCtx.metersPerPixel,
			max_feature_frequency: scaleCtx.maxFeatureFrequency,
			mode: renderModeToGpu(scaleCtx.mode),
			_pad0: 0,
			_pad1: 0,
			_pad2: 0
		};
		const scaleStaging = new ArrayBuffer(32);
		writeScaleContextToBuffer(scaleStaging, 0, scale);
		this.device.queue.writeBuffer(this.scaleBuffer, 0, scaleStaging);

		const lf: GpuLocalFrame = {
			origin_ecef: [...frame.localFrame.originEcef, 0],
			east: [...frame.localFrame.east, 0],
			north: [...frame.localFrame.north, 0],
			up: [...frame.localFrame.up, 0],
			planet_center_local: [...frame.localFrame.planetCenterLocal, 0],
			camera_local: [...frame.localFrame.cameraLocal, 0]
		};
		const lfStaging = new ArrayBuffer(96);
		writeLocalFrameToBuffer(lfStaging, 0, lf);
		this.device.queue.writeBuffer(this.localFrameBuffer, 0, lfStaging);
	}

	render(
		encoder: GPUCommandEncoder,
		colorView: GPUTextureView,
		frame: RenderFrame,
		width: number,
		height: number
	): RenderStats {
		const t0 = performance.now();
		this.ensureDepth(width, height);
		this.uploadUniforms(frame);

		const passEncoder = encoder.beginRenderPass({
			colorAttachments: [
				{
					view: colorView,
					clearValue: { r: 0.02, g: 0.03, b: 0.08, a: 1 },
					loadOp: 'clear',
					storeOp: 'store'
				}
			],
			depthStencilAttachment: {
				view: this.depthView!,
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store'
			}
		});

		const viewBg = this.device.createBindGroup({
			layout: this.cubePipeline.getBindGroupLayout(BIND_GROUP.frame),
			entries: [{ binding: 0, resource: { buffer: this.viewBuffer } }]
		});
		const planetBg = this.device.createBindGroup({
			layout: this.cubePipeline.getBindGroupLayout(BIND_GROUP.planet),
			entries: [{ binding: 0, resource: { buffer: this.planetBuffer } }]
		});
		const scaleBg = this.device.createBindGroup({
			layout: this.cubePipeline.getBindGroupLayout(BIND_GROUP.scale),
			entries: [{ binding: 0, resource: { buffer: this.scaleBuffer } }]
		});

		let patchCount = 0;
		let vertexCount = 0;

		if (this.cubePatchBuffer && this.cubePatchCount > 0) {
			const cubeVerts = cubePatchVertexCount(frame.cubeSpherePatches[0]?.resolution ?? 16);
			const patchBg = this.device.createBindGroup({
				layout: this.cubePipeline.getBindGroupLayout(BIND_GROUP.patches),
				entries: [{ binding: 0, resource: { buffer: this.cubePatchBuffer } }]
			});
			passEncoder.setPipeline(this.cubePipeline);
			passEncoder.setBindGroup(0, viewBg);
			passEncoder.setBindGroup(1, planetBg);
			passEncoder.setBindGroup(2, scaleBg);
			passEncoder.setBindGroup(3, patchBg);
			passEncoder.draw(cubeVerts, this.cubePatchCount);
			patchCount += this.cubePatchCount;
			vertexCount += this.cubePatchCount * cubeVerts;
		}

		if (this.surfacePatchBuffer && this.surfacePatchCount > 0) {
			const patchBg = this.device.createBindGroup({
				layout: this.surfacePipeline.getBindGroupLayout(BIND_GROUP.patches),
				entries: [{ binding: 0, resource: { buffer: this.surfacePatchBuffer } }]
			});
			const scaleLocalBg = this.device.createBindGroup({
				layout: this.surfacePipeline.getBindGroupLayout(BIND_GROUP.scale),
				entries: [
					{ binding: 0, resource: { buffer: this.scaleBuffer } },
					{ binding: 1, resource: { buffer: this.localFrameBuffer } }
				]
			});
			passEncoder.setPipeline(this.surfacePipeline);
			passEncoder.setBindGroup(0, viewBg);
			passEncoder.setBindGroup(1, planetBg);
			passEncoder.setBindGroup(2, scaleLocalBg);
			passEncoder.setBindGroup(3, patchBg);
			passEncoder.draw(VERTS_PER_PATCH, this.surfacePatchCount);
			patchCount += this.surfacePatchCount;
			vertexCount += this.surfacePatchCount * VERTS_PER_PATCH;
		}

		passEncoder.end();
		const frameMs = performance.now() - t0;
		return { frameMs, patchCount, vertexCount, mode: frame.camera.mode };
	}

	destroy(): void {
		this.viewBuffer.destroy();
		this.planetBuffer.destroy();
		this.scaleBuffer.destroy();
		this.localFrameBuffer.destroy();
		this.cubePatchBuffer?.destroy();
		this.surfacePatchBuffer?.destroy();
		this.depthTexture?.destroy();
	}
}
