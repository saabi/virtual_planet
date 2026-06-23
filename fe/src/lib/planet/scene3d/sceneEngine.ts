// The scene render engine: owns the GPU device, the shared depth buffer, and the
// render-pass lifecycle. Draws are recorded into the pass it opens (spheres now;
// procedural composite + single-pass terrain share the same color + depth later).
// See _docs/specs/unified-scene-renderer.md.

const CLEAR = { r: 0.02, g: 0.03, b: 0.06, a: 1 };

export class SceneEngine {
	readonly device: GPUDevice;
	readonly format: GPUTextureFormat;
	private depth: GPUTexture | null = null;
	private depthW = 0;
	private depthH = 0;

	constructor(device: GPUDevice, format: GPUTextureFormat) {
		this.device = device;
		this.format = format;
	}

	private ensureDepth(width: number, height: number): GPUTexture {
		if (this.depth && this.depthW === width && this.depthH === height) return this.depth;
		this.depth?.destroy();
		this.depth = this.device.createTexture({
			size: { width, height },
			format: 'depth24plus',
			// TEXTURE_BINDING: the overlay (atmosphere) pass samples this depth after the
			// scene pass ends, to occlude the atmosphere against nearer bodies.
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this.depthW = width;
		this.depthH = height;
		return this.depth;
	}

	/**
	 * Open a frame's render pass (clear color + depth), record the scene draws, submit.
	 * If `recordOverlay` is given, a second pass runs after the scene pass *ends* — color
	 * loaded (not cleared), no depth attachment — with the depth available as a sampleable
	 * view (a depth texture can't be sampled while it's an active attachment). Used by the
	 * atmosphere composite, which reads the scene depth for occlusion.
	 */
	render(
		colorView: GPUTextureView,
		width: number,
		height: number,
		recordScene: (pass: GPURenderPassEncoder) => void,
		recordOverlay?: (pass: GPURenderPassEncoder, depthView: GPUTextureView) => void
	) {
		const depth = this.ensureDepth(width, height);
		const encoder = this.device.createCommandEncoder();
		const scenePass = encoder.beginRenderPass({
			colorAttachments: [{ view: colorView, clearValue: CLEAR, loadOp: 'clear', storeOp: 'store' }],
			depthStencilAttachment: {
				view: depth.createView(),
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store'
			}
		});
		recordScene(scenePass);
		scenePass.end();
		if (recordOverlay) {
			const overlayPass = encoder.beginRenderPass({
				colorAttachments: [{ view: colorView, loadOp: 'load', storeOp: 'store' }]
			});
			recordOverlay(overlayPass, depth.createView());
			overlayPass.end();
		}
		this.device.queue.submit([encoder.finish()]);
	}

	destroy() {
		this.depth?.destroy();
		this.depth = null;
	}
}
