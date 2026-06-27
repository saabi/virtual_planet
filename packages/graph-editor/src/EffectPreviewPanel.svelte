<script lang="ts">
	import {
		executeFullscreenFragment,
		requestGpuDevice,
		type ShaderToyHostInputs
	} from '@virtual-planet/runtime-webgpu';

	import { cosinePaletteEffectGraph, cosinePaletteEffectOutput } from './effectGraph.js';

	interface Props {
		size?: number;
	}

	let { size = 256 }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let statusMessage = $state<string | null>(null);
	let pointer = $state<[number, number, number, number]>([0, 0, 0, 0]);
	let startTime = performance.now();

	const graph = cosinePaletteEffectGraph();
	const output = cosinePaletteEffectOutput();

	const webGpuAvailable =
		typeof navigator !== 'undefined' && typeof navigator.gpu !== 'undefined';

	function onPointerMove(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		const click = event.buttons > 0 ? 1 : 0;
		pointer = [x, y, click, 0];
	}

	function onPointerDown(event: PointerEvent) {
		onPointerMove(event);
		pointer = [pointer[0], pointer[1], 1, 0];
	}

	function onPointerUp() {
		pointer = [pointer[0], pointer[1], 0, 0];
	}

	$effect(() => {
		if (!canvas || !webGpuAvailable) {
			if (!webGpuAvailable) {
				statusMessage = 'WebGPU is not available in this browser.';
			}
			return;
		}

		let cancelled = false;
		let frame = 0;
		let device: GPUDevice | null = null;
		statusMessage = 'Rendering…';

		void (async () => {
			try {
				const handle = await requestGpuDevice();
				device = handle.device;
				if (cancelled) return;
				statusMessage = null;

				const render = async () => {
					if (cancelled || !device || !canvas) return;

					const host: ShaderToyHostInputs = {
						iTime: (performance.now() - startTime) / 1000,
						iFrame: frame++,
						iMouse: pointer
					};

					try {
						const result = await executeFullscreenFragment({
							device,
							graph,
							output,
							width: size,
							height: size,
							host
						});

						const context = canvas.getContext('2d');
						if (!context) return;

						const image = context.createImageData(size, size);
						image.data.set(result.pixels);
						context.putImageData(image, 0, 0);
					} catch (error) {
						if (!cancelled) {
							statusMessage =
								error instanceof Error ? error.message : 'Effect preview failed.';
						}
						return;
					}

					requestAnimationFrame(() => {
						void render();
					});
				};

				void render();
			} catch (error) {
				if (!cancelled) {
					statusMessage = error instanceof Error ? error.message : 'WebGPU init failed.';
				}
			}
		})();

		return () => {
			cancelled = true;
			device?.destroy();
		};
	});
</script>

<div
	class="preview"
	role="img"
	aria-label="ShaderToy cosine palette effect preview"
	onpointermove={onPointerMove}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
	onpointerleave={onPointerUp}
>
	<h2 class="title">Effect preview</h2>
	<canvas bind:this={canvas} width={size} height={size} class="effect-canvas"></canvas>
	{#if statusMessage}
		<p class="status">{statusMessage}</p>
	{/if}
</div>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		height: 100%;
		align-items: center;
	}

	.title {
		margin: 0;
		align-self: flex-start;
		font-size: 12px;
		font-weight: 600;
	}

	.effect-canvas {
		width: min(100%, 320px);
		height: auto;
		image-rendering: pixelated;
		border: 1px solid rgba(255, 255, 255, 0.12);
		touch-action: none;
	}

	.status {
		margin: 0;
		font-size: 11px;
		opacity: 0.7;
		text-align: center;
	}
</style>
