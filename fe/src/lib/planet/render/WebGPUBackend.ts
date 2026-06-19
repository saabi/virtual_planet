import type { PickingResult, RenderBackend, RenderFrame, RenderStats } from './RenderBackend.js';
import { configureWebGPUCanvas, requestWebGPUDevice } from './device.js';
import { AtmospherePass } from './passes/atmospherePass.js';
import { TerrainPass } from './passes/terrainPass.js';

export class WebGPUBackend implements RenderBackend {
	readonly kind = 'webgpu' as const;
	onDeviceLost?: (reason: string) => void;
	private device: GPUDevice | null = null;
	private context: GPUCanvasContext | null = null;
	private format: GPUTextureFormat = 'bgra8unorm';
	private terrain: TerrainPass | null = null;
	private atmosphere: AtmospherePass | null = null;
	private width = 1;
	private height = 1;
	private destroyed = false;

	async init(canvas: HTMLCanvasElement): Promise<void> {
		const { device } = await requestWebGPUDevice();
		this.device = device;
		// device.lost resolves with reason 'destroyed' on our own destroy() (ignore),
		// or 'unknown' on a driver crash / TDR / OOM (report so the host can recover).
		void device.lost.then((info) => {
			if (this.destroyed || info.reason === 'destroyed') return;
			this.device = null;
			this.onDeviceLost?.(info.reason ?? 'unknown');
		});
		this.format = navigator.gpu!.getPreferredCanvasFormat();
		this.context = configureWebGPUCanvas(device, canvas, this.format);
		this.terrain = new TerrainPass(device, this.format);
		this.atmosphere = new AtmospherePass(device, this.format);
	}

	resize(width: number, height: number): void {
		this.width = Math.max(1, width);
		this.height = Math.max(1, height);
	}

	render(frame: RenderFrame): RenderStats {
		if (!this.device || !this.context || !this.terrain || !this.atmosphere) {
			return { frameMs: 0, patchCount: 0, vertexCount: 0, mode: frame.camera.mode };
		}
		this.terrain.updateSurfacePatches(frame);
		const texture = this.context.getCurrentTexture();
		const encoder = this.device.createCommandEncoder();
		const stats = this.terrain.render(encoder, frame, this.width, this.height);
		this.atmosphere.render(encoder, texture, this.terrain, frame, this.width, this.height);
		this.device.queue.submit([encoder.finish()]);
		return stats;
	}

	renderPickingPass(): PickingResult {
		return { hit: false };
	}

	renderHeightfieldPass(): void {
		// stub
	}

	destroy(): void {
		this.destroyed = true;
		this.atmosphere?.destroy();
		this.terrain?.destroy();
		this.device?.destroy();
		this.device = null;
		this.context = null;
		this.terrain = null;
		this.atmosphere = null;
	}
}
