<script module lang="ts">
	import type { PlanetScene } from '$lib/planet/scene/types.js';

	interface Props {
		scene: PlanetScene;
		selectedId: string | null;
		onSave?: () => void;
		onReset?: () => void;
		onAddGroup?: () => void;
		onAddBody?: () => void;
		onAddOrbit?: () => void;
		onDelete?: () => void;
	}
</script>

<script lang="ts">
	import SystemTreePanel from '$lib/planet/components/SystemTreePanel.svelte';

	let {
		scene = $bindable(),
		selectedId = $bindable(),
		onSave,
		onReset,
		onAddGroup,
		onAddBody,
		onAddOrbit,
		onDelete
	}: Props = $props();
</script>

<div class="outliner-panel">
	<div class="doc-controls">
		<button type="button" onclick={onSave}>Save</button>
		<button type="button" onclick={onReset}>Reset</button>
	</div>
	<SystemTreePanel bind:scene bind:selectedId />
	<div class="edit-actions">
		<button type="button" onclick={onAddGroup}>+ Group</button>
		<button type="button" onclick={onAddBody}>+ Body</button>
		<button type="button" onclick={onAddOrbit}>+ Orbit</button>
		<button type="button" onclick={onDelete} disabled={!selectedId}>Delete</button>
	</div>
	<p class="hint">Click a body in the map or tree — the URL follows the scene path.</p>
</div>

<style>
	.outliner-panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
		padding: 12px;
	}

	.doc-controls {
		display: flex;
		gap: 6px;
	}

	.doc-controls button {
		flex: 1;
		font: 11px/1.2 system-ui, sans-serif;
		padding: 4px 6px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: #1a1f30;
		color: inherit;
		cursor: pointer;
	}

	.doc-controls button:hover {
		background: #252d45;
	}

	.edit-actions {
		display: flex;
		gap: 6px;
	}

	.edit-actions button {
		flex: 1;
		font: 11px/1.2 system-ui, sans-serif;
		padding: 4px 6px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: #1a1f30;
		color: inherit;
		cursor: pointer;
	}

	.edit-actions button:hover:not(:disabled) {
		background: #252d45;
	}

	.edit-actions button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.hint {
		margin: 0;
		font-size: 11px;
		opacity: 0.6;
	}
</style>
