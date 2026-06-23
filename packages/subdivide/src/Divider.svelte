<script module lang="ts">
	import type { DividerData } from './layout/runtime.js';

	interface Props {
		divider: DividerData;
		layoutTick: number;
		onmousedown?: (event: MouseEvent) => void;
	}
</script>

<script lang="ts">
	let { divider, layoutTick, onmousedown }: Props = $props();

	const style = $derived.by(() => {
		layoutTick;
		const group = divider.parent;
		const x = group.getLeft();
		const y = group.getTop();
		const w = group.getWidth();
		const h = group.getHeight();
		const position = divider.position ?? 0;

		if (divider.type === 'horizontal') {
			return `left: ${x * 100}%; top: ${(y + position * h) * 100}%; width: ${w * 100}%; height: 0`;
		}

		return `top: ${y * 100}%; left: ${(x + position * w) * 100}%; width: 0; height: ${h * 100}%`;
	});

	function handleMousedown(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		onmousedown?.(event);
	}
</script>

<div
	class="divider {divider.type}"
	{style}
	onmousedown={handleMousedown}
	role="separator"
	aria-orientation={divider.type === 'horizontal' ? 'horizontal' : 'vertical'}
></div>

<style>
	.divider {
		position: absolute;
		z-index: 10;
		width: 0;
		height: 0;
		pointer-events: all;
	}

	.divider::after {
		content: '';
		position: absolute;
		left: calc(0px - var(--draggable));
		top: calc(0px - var(--draggable));
		width: calc(100% + var(--draggable) * 2);
		height: calc(100% + var(--draggable) * 2);
	}

	.horizontal {
		cursor: row-resize;
	}

	.vertical {
		cursor: col-resize;
	}

	.divider::before {
		content: '';
		position: absolute;
		left: calc(0px - var(--thickness) / 2);
		top: calc(0px - var(--thickness) / 2);
		width: calc(100% + var(--thickness));
		height: calc(100% + var(--thickness));
		background-color: var(--color);
	}
</style>
