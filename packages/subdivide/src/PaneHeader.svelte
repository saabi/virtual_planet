<script module lang="ts">
	interface Props {
		paneId: string;
		zone: string;
		availableZones: string[];
		zoneLabels: Record<string, string>;
		onzonechange?: (zone: string) => void;
	}
</script>

<script lang="ts">
	let { paneId, zone, availableZones, zoneLabels, onzonechange }: Props = $props();

	const menuId = `subdivide-menu-${paneId}`;

	function selectZone(next: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const input = document.getElementById(menuId) as HTMLInputElement | null;
		if (input) input.checked = false;
		if (next !== zone) onzonechange?.(next);
	}

	function stopBubble(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<div class="pane-header" onmousedown={stopBubble}>
	<input type="checkbox" id={menuId} class="menu-opener" />
	<label class="menu-trigger" for={menuId} aria-label="Change pane type" title="Change pane type"></label>
	<ul class="menu">
		{#each availableZones as z (z)}
			<li>
				<button
					type="button"
					class:selected={z === zone}
					onclick={(event) => selectZone(z, event)}
				>
					{zoneLabels[z] ?? z}
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.pane-header {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 3;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.menu-opener {
		display: none;
	}

	.menu-trigger {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 22px 22px 0 0;
		border-color: var(--subdivide-menu-color, #4a6fa5) transparent transparent transparent;
		cursor: pointer;
		pointer-events: auto;
		opacity: 0.85;
	}

	.menu-trigger:hover {
		opacity: 1;
	}

	.menu {
		display: none;
		position: absolute;
		top: 22px;
		left: 0;
		min-width: 9rem;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		background: var(--subdivide-menu-bg, #2a3142);
		border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
		pointer-events: auto;
	}

	.menu-opener:checked ~ .menu {
		display: block;
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

	.menu button:hover {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.menu button.selected {
		background: color-mix(in srgb, var(--subdivide-menu-color, #4a6fa5) 35%, transparent);
		font-weight: 600;
	}
</style>
