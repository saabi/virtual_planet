// The scene render engine: owns the GPU device, the shared depth buffer, and the
// render-pass lifecycle. Draws are recorded into the pass it opens (spheres now;
// procedural composite + single-pass terrain share the same color + depth later).
// See _docs/specs/unified-scene-renderer.md.

const CLEAR = { r: 0.02, g: 0.03, b: 0.06, a: 1 };
const SURFACE_DISTANCE_FORMAT: GPUTextureFormat = 'r32float';
type ClearColor = { r: number; g: number; b: number; a: number };
export type SceneOverlayCompositeMode = 'explicit-composite' | 'hardware-alpha';

export interface SceneOverlayContext {
	pass: GPURenderPassEncoder;
	/** Offscreen scene color from the geometry pass (explicit-composite only). */
	sceneColorView: GPUTextureView | null;
	/** Scene layer this overlay pass samples for compositing. */
	compositeSourceView: GPUTextureView;
	depthView: GPUTextureView;
	surfaceDistanceView: GPUTextureView;
	mode: SceneOverlayCompositeMode;
}

export type SceneOverlayFn = (overlay: SceneOverlayContext) => void;

export interface SceneWaterContext {
	pass: GPURenderPassEncoder;
	sceneColorView: GPUTextureView;
	depthView: GPUTextureView;
	width: number;
	height: number;
}

export type SceneWaterFn = (water: SceneWaterContext) => void;

export class SceneEngine {
	readonly device: GPUDevice;
	readonly format: GPUTextureFormat;
	private depth: GPUTexture | null = null;
	private sceneColor: GPUTexture | null = null;
	private waterColor: GPUTexture | null = null;
	private surfaceDistance: GPUTexture | null = null;
	private depthW = 0;
	private depthH = 0;
	private sceneColorW = 0;
	private sceneColorH = 0;
	private waterColorW = 0;
	private waterColorH = 0;
	private surfaceDistanceW = 0;
	private surfaceDistanceH = 0;

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
			// TEXTURE_BINDING: the overlay atmosphere pass samples this after the scene pass
			// ends, so nearer bodies can occlude atmosphere halos.
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this.depthW = width;
		this.depthH = height;
		return this.depth;
	}

	private ensureSurfaceDistance(width: number, height: number): GPUTexture {
		if (
			this.surfaceDistance &&
			this.surfaceDistanceW === width &&
			this.surfaceDistanceH === height
		) {
			return this.surfaceDistance;
		}
		this.surfaceDistance?.destroy();
		this.surfaceDistance = this.device.createTexture({
			size: { width, height },
			format: SURFACE_DISTANCE_FORMAT,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this.surfaceDistanceW = width;
		this.surfaceDistanceH = height;
		return this.surfaceDistance;
	}

	private ensureSceneColor(width: number, height: number): GPUTexture {
		if (this.sceneColor && this.sceneColorW === width && this.sceneColorH === height) {
			return this.sceneColor;
		}
		this.sceneColor?.destroy();
		this.sceneColor = this.device.createTexture({
			size: { width, height },
			format: this.format,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this.sceneColorW = width;
		this.sceneColorH = height;
		return this.sceneColor;
	}

	private ensureWaterColor(width: number, height: number): GPUTexture {
		if (this.waterColor && this.waterColorW === width && this.waterColorH === height) {
			return this.waterColor;
		}
		this.waterColor?.destroy();
		this.waterColor = this.device.createTexture({
			size: { width, height },
			format: this.format,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this.waterColorW = width;
		this.waterColorH = height;
		return this.waterColor;
	}

	/**
	 * Open a frame's render pass (clear color + depth), record the scene draws, submit.
	 * If `recordOverlay` is given, a second pass runs after the scene pass *ends* — color
	 * loaded (not cleared), no depth attachment — with the depth available as a sampleable
	 * view (a depth texture can't be sampled while it's an active attachment).
	 */
	render(
		colorView: GPUTextureView,
		width: number,
		height: number,
		recordScene: (pass: GPURenderPassEncoder) => void,
		recordWater?: SceneWaterFn,
		recordOverlay?: SceneOverlayFn,
		clearColor: ClearColor = CLEAR,
		overlayMode: SceneOverlayCompositeMode = 'explicit-composite'
	) {
		const depth = this.ensureDepth(width, height);
		const surfaceDistance = this.ensureSurfaceDistance(width, height);
		const useOffscreenSceneColor =
			!!recordWater || (!!recordOverlay && overlayMode === 'explicit-composite');
		const sceneColorTexture = useOffscreenSceneColor ? this.ensureSceneColor(width, height) : null;
		const sceneColorView = sceneColorTexture ? sceneColorTexture.createView() : colorView;
		let postWaterView = sceneColorView;
		const encoder = this.device.createCommandEncoder();
		const scenePass = encoder.beginRenderPass({
			colorAttachments: [
				{ view: sceneColorView, clearValue: clearColor, loadOp: 'clear', storeOp: 'store' },
				{
					view: surfaceDistance.createView(),
					clearValue: { r: -1, g: 0, b: 0, a: 0 },
					loadOp: 'clear',
					storeOp: 'store'
				}
			],
			depthStencilAttachment: {
				view: depth.createView(),
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store'
			}
		});
		recordScene(scenePass);
		scenePass.end();
		if (recordWater) {
			const waterOutputView =
				recordOverlay && overlayMode === 'explicit-composite'
					? this.ensureWaterColor(width, height).createView()
					: colorView;
			const waterPass = encoder.beginRenderPass({
				colorAttachments: [
					{
						view: waterOutputView,
						clearValue: clearColor,
						loadOp: 'clear',
						storeOp: 'store'
					}
				]
			});
			recordWater({
				pass: waterPass,
				sceneColorView,
				depthView: depth.createView(),
				width,
				height
			});
			waterPass.end();
			postWaterView = waterOutputView;
		}
		if (recordOverlay) {
			const readView = postWaterView;
			const overlayPass = encoder.beginRenderPass({
				colorAttachments: [
					{
						view: colorView,
						clearValue: clearColor,
						loadOp: overlayMode === 'explicit-composite' ? 'clear' : 'load',
						storeOp: 'store'
					}
				]
			});
			recordOverlay({
				pass: overlayPass,
				sceneColorView: postWaterView === colorView ? null : postWaterView,
				compositeSourceView: readView,
				depthView: depth.createView(),
				surfaceDistanceView: surfaceDistance.createView(),
				mode: overlayMode
			});
			overlayPass.end();
		}
		this.device.queue.submit([encoder.finish()]);
	}

	destroy() {
		this.depth?.destroy();
		this.sceneColor?.destroy();
		this.waterColor?.destroy();
		this.surfaceDistance?.destroy();
		this.depth = null;
		this.sceneColor = null;
		this.waterColor = null;
		this.surfaceDistance = null;
	}
}
