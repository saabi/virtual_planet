<script lang="ts">
	import type { GraphDocument, PortRef } from '@virtual-planet/graph';
	import { executePlaneScalarPreview, requestGpuDevice } from '@virtual-planet/runtime-webgpu';

	interface Props {
		graph: GraphDocument;
		output: PortRef | null;
		size?: number;
		refreshEpoch?: number;
	}

	let { graph, output, size = 64, refreshEpoch = 0 }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let statusMessage = $state<string | null>(null);

	const webGpuAvailable =
		typeof navigator !== 'undefined' && typeof navigator.gpu !== 'undefined';

	$effect(() => {
		void refreshEpoch;
		if (!canvas || !output) return;

		if (!webGpuAvailable) {
			statusMessage = 'WebGPU is not available in this browser.';
			return;
		}

		let cancelled = false;
		statusMessage = 'Rendering…';

		void (async () => {
			try {
				const { device } = await requestGpuDevice();
				if (cancelled) return;

				const result = await executePlaneScalarPreview({
					device,
					graph,
					output,
					width: size,
					height: size
				});
				if (cancelled) return;

				const context = canvas?.getContext('2d');
				if (!context) {
					statusMessage = 'Canvas 2D context unavailable.';
					return;
				}

				const image = context.createImageData(size, size);
				image.data.set(result.pixels);
				context.putImageData(image, 0, 0);
				statusMessage = null;
			} catch (error) {
				if (cancelled) return;
				statusMessage = error instanceof Error ? error.message : 'GPU preview failed.';
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="preview">
	<h2 class="title">GPU preview</h2>
	{#if output}
		<canvas bind:this={canvas} width={size} height={size} class="heatmap"></canvas>
		{#if statusMessage}
			<p class="status">{statusMessage}</p>
		{/if}
	{:else}
		<p class="empty">Wire a scalar output to preview.</p>
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

	.heatmap {
		width: min(100%, 256px);
		height: auto;
		image-rendering: pixelated;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.status {
		margin: 0;
		font-size: 11px;
		opacity: 0.7;
		text-align: center;
	}

	.empty {
		margin: 0;
		font-size: 11px;
		opacity: 0.6;
	}
</style>
