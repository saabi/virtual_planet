import compositeWgsl from '../gpu/wgsl/scene3d/composite.wgsl';

// Composites the procedural body's offscreen color over the scene inside SceneEngine's
// render pass (after the spheres), with an objectOpacity cross-fade. Records like
// SpherePass. Step 2: radial feather + opacity (CSS-mask parity). Step 3 will add the
// analytic depth test against the scene depth. See gpu/wgsl/scene3d/composite.wgsl.

export interface CompositeMask {
	/** Body centre + feather radii in framebuffer pixels. */
	x: number;
	y: number;
	r0: number;
	r1: number;
}

/** Packs the 32-byte composite uniform (mask vec4 + params vec4). Exposed for tests. */
export function packCompositeUniform(
	mask: CompositeMask,
	objectOpacity: number,
	width: number,
	height: number
): Float32Array {
	const u = new Float32Array(8);
	u.set([mask.x, mask.y, mask.r0, mask.r1], 0);
	u.set([objectOpacity, width, height, 0], 4);
	return u;
}

export class CompositePass {
	private device: GPUDevice;
	private pipeline: GPURenderPipeline;
	private ubuf: GPUBuffer;
	private sampler: GPUSampler;

	constructor(device: GPUDevice, format: GPUTextureFormat) {
		this.device = device;
		const module = device.createShaderModule({ code: compositeWgsl });
		this.pipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module, entryPoint: 'vs' },
			fragment: {
				module,
				entryPoint: 'fs',
				targets: [
					{
						format,
						blend: {
							color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
							alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
						}
					}
				]
			},
			primitive: { topology: 'triangle-list' },
			// The engine pass has a depth attachment, so the pipeline must declare one; the
			// composite neither tests nor writes depth in step 2.
			depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' }
		});
		this.ubuf = this.device.createBuffer({
			size: 32,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		this.sampler = this.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'clamp-to-edge',
			addressModeV: 'clamp-to-edge'
		});
	}

	/** Record the composite of `colorView` (the procedural offscreen) into the engine pass. */
	record(
		pass: GPURenderPassEncoder,
		colorView: GPUTextureView,
		mask: CompositeMask,
		objectOpacity: number,
		width: number,
		height: number
	) {
		this.device.queue.writeBuffer(this.ubuf, 0, packCompositeUniform(mask, objectOpacity, width, height));
		const bindGroup = this.device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.ubuf } },
				{ binding: 1, resource: this.sampler },
				{ binding: 2, resource: colorView }
			]
		});
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(3);
	}

	destroy() {
		this.ubuf.destroy();
	}
}
