<script lang="ts">
	import { createToySolarSystemScene } from '$lib/planet/scene/solarSystem.js';
	import { getNode } from '$lib/planet/scene/sceneTree.js';
	import { editorForKind } from '$lib/planet/scene/nodeSchemas.js';
	import { fields } from '@virtual-planet/schema';
	import SystemMapPanel from '$lib/planet/components/SystemMapPanel.svelte';
	import SystemTreePanel from '$lib/planet/components/SystemTreePanel.svelte';
	import SchemaForm from '$lib/planet/components/SchemaForm.svelte';
	import type { PlanetScene } from '$lib/planet/scene/types.js';

	let scene = $state(createToySolarSystemScene());
	let selectedId = $state<string | null>(null);

	const selectedNode = $derived(selectedId ? (getNode(scene, selectedId) ?? null) : null);
	// Generated editor for the selected node (bespoke for bodies; schema-driven else).
	const editor = $derived(selectedNode ? editorForKind(selectedNode.kind) : null);
	const schemaValue = $derived.by(() => {
		if (!selectedNode || editor?.mode !== 'schema') return {};
		const node = selectedNode as unknown as Record<string, unknown>;
		const v: Record<string, unknown> = {};
		for (const f of fields(editor.schema)) v[f.key] = node[f.key];
		return v;
	});

	function updateNode(s: PlanetScene, id: string, changes: Record<string, unknown>): PlanetScene {
		const node = s.nodes.get(id);
		if (!node) return s;
		const nodes = new Map(s.nodes);
		nodes.set(id, { ...node, ...changes });
		return { rootId: s.rootId, nodes };
	}

	function onFieldChange(next: Record<string, unknown>) {
		if (selectedId) scene = updateNode(scene, selectedId, next);
	}
</script>

<div class="system-page">
	<aside class="system-sidebar">
		<SystemTreePanel bind:scene bind:selectedId />
		{#if selectedNode}
			<div class="node-editor">
				<span class="edit-name">{selectedNode.name}</span>
				{#if editor?.mode === 'bespoke'}
					<!-- Bodies get the bespoke editor; stubbed to the legacy /planet editor
					     until per-body params + the nested route exist. -->
					<a class="edit-link" href="/planet">Edit in planet editor →</a>
				{:else if editor?.mode === 'schema'}
					<SchemaForm schema={editor.schema} value={schemaValue} onchange={onFieldChange} />
				{/if}
			</div>
		{/if}
		<p class="hint">Click a body in the map or tree to select it.</p>
	</aside>
	<main class="system-main">
		<SystemMapPanel {scene} bind:selectedId />
	</main>
</div>

<style>
	.system-page {
		display: flex;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #05070e;
		color: #e8ecf8;
		font: 13px/1.4 system-ui, sans-serif;
	}

	.system-sidebar {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 300px;
		flex-shrink: 0;
		padding: 12px;
		box-sizing: border-box;
		overflow-y: auto;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}

	.system-main {
		flex: 1;
		min-width: 0;
		padding: 12px;
		box-sizing: border-box;
	}

	.system-main :global(.system-map) {
		height: 100%;
	}

	.system-main :global(.map-canvas) {
		height: calc(100% - 36px);
	}

	.node-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 10px;
		background: rgba(8, 10, 20, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
	}

	.edit-name {
		font-weight: 600;
	}

	.edit-link {
		color: #9ec0ff;
		text-decoration: none;
		font-size: 12px;
	}

	.edit-link:hover {
		text-decoration: underline;
	}

	.hint {
		margin: 0;
		font-size: 11px;
		opacity: 0.6;
	}
</style>
