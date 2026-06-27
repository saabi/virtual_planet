<script module lang="ts">
	import type { PaneContextAction } from './layout/types.js';

	interface Props {
		x: number;
		y: number;
		items: PaneContextAction[];
		paneId: string;
		zone: string;
		onclose?: () => void;
	}
</script>

<script lang="ts">
	import { isPaneMenuSeparator } from './layout/menu.js';

	let { x, y, items, paneId, zone, onclose }: Props = $props();

	function runAction(action: PaneContextAction) {
		if (action.disabled || isPaneMenuSeparator(action)) return;
		action.run({ paneId, zone });
		onclose?.();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose?.();
		}
	}
</script>

<svelte:window onclick={onclose} onkeydown={onKeydown} />

<div class="menu-backdrop" role="presentation" oncontextmenu={(event) => event.preventDefault()}>
	<ul class="menu" style:left="{x}px" style:top="{y}px" role="menu">
		{#each items as action (action.id)}
			{#if isPaneMenuSeparator(action)}
				<li class="separator" role="separator" aria-hidden="true"></li>
			{:else}
				<li role="none">
					<button
						type="button"
						role="menuitem"
						disabled={action.disabled}
						onclick={() => runAction(action)}
					>
						{action.label}
					</button>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<style>
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 2147483646;
	}

	.menu {
		position: fixed;
		min-width: 9rem;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		background: var(--subdivide-menu-bg, #2a3142);
		border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
		color: inherit;
	}

	.menu li {
		margin: 0;
	}

	.menu button {
		display: block;
		width: 100%;
		padding: 5px 12px;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
	}

	.menu button:hover:not(:disabled) {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.menu button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.separator {
		height: 1px;
		margin: 4px 0;
		background: color-mix(in srgb, currentColor 15%, transparent);
	}
</style>
