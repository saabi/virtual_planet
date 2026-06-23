<script lang="ts">
	import {
		ancestorIds,
		isNodeEnabled,
		sceneTreeNodeHasChildren,
		nodeKindLabel,
		setNodeEnabled,
		visibleSceneTreeRows
	} from '../scene/sceneTree.js';
	import { reparent } from '../scene/sceneEdit.js';
	import type { PlanetScene, SceneNode } from '../scene/types.js';

	interface Props {
		scene: PlanetScene;
		/** Shared selection with the system map. */
		selectedId?: string | null;
	}

	let { scene = $bindable(), selectedId = $bindable(null) }: Props = $props();

	let collapsedIds = $state(new Set<string>());
	let draggingId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);

	const rows = $derived(visibleSceneTreeRows(scene, collapsedIds));

	$effect(() => {
		const id = selectedId;
		if (!id) return;
		const ancestors = ancestorIds(scene, id);
		if (ancestors.length === 0) return;
		const next = new Set(collapsedIds);
		let changed = false;
		for (const aid of ancestors) {
			if (next.delete(aid)) changed = true;
		}
		if (changed) collapsedIds = next;
	});

	function toggleCollapsed(nodeId: string, event: MouseEvent) {
		event.stopPropagation();
		const next = new Set(collapsedIds);
		if (next.has(nodeId)) next.delete(nodeId);
		else next.add(nodeId);
		collapsedIds = next;
	}

	function onDrop(targetId: string) {
		if (draggingId && draggingId !== targetId) scene = reparent(scene, draggingId, targetId);
		draggingId = null;
		dragOverId = null;
	}

	function rowActive(node: SceneNode): boolean {
		return isNodeEnabled(scene, node.id) && node.enabled;
	}

	function toggleEnabled(nodeId: string, enabled: boolean) {
		scene = setNodeEnabled(scene, nodeId, enabled);
	}

	function kindLabel(node: SceneNode): string {
		if (node.kind === 'body') {
			const km = Math.round(node.radiusMeters / 1000).toLocaleString();
			return `${node.bodyType.replace('_', ' ')} · ${km} km${node.standIn ? ' · stand-in' : ''}`;
		}
		return nodeKindLabel(node.kind);
	}
</script>

<aside class="system-tree" aria-label="System tree">
	<h2>System</h2>
	<ul class="tree-list">
		{#each rows as { node, depth } (node.id)}
			{@const hasChildren = sceneTreeNodeHasChildren(scene, node.id)}
			{@const isCollapsed = collapsedIds.has(node.id)}
			<li
				class="tree-row"
				class:inactive={!rowActive(node)}
				class:selected={node.id === selectedId}
				class:dragging={node.id === draggingId}
				class:drag-over={node.id === dragOverId && node.id !== draggingId}
				style:--depth={depth}
				draggable="true"
				ondragstart={(e) => {
					draggingId = node.id;
					e.dataTransfer?.setData('text/plain', node.id);
				}}
				ondragend={() => {
					draggingId = null;
					dragOverId = null;
				}}
				ondragover={(e) => {
					e.preventDefault();
					dragOverId = node.id;
				}}
				ondragleave={() => {
					if (dragOverId === node.id) dragOverId = null;
				}}
				ondrop={(e) => {
					e.preventDefault();
					onDrop(node.id);
				}}
			>
				<div class="tree-label">
					{#if hasChildren}
						<button
							type="button"
							class="tree-chevron"
							class:collapsed={isCollapsed}
							aria-label={isCollapsed ? 'Expand' : 'Collapse'}
							aria-expanded={!isCollapsed}
							onclick={(e) => toggleCollapsed(node.id, e)}
						>
							▸
						</button>
					{:else}
						<span class="tree-chevron-spacer" aria-hidden="true"></span>
					{/if}
					<input
						type="checkbox"
						aria-label="enabled"
						checked={node.enabled}
						onchange={(e) => toggleEnabled(node.id, e.currentTarget.checked)}
					/>
					<button type="button" class="tree-name" onclick={() => (selectedId = node.id)}>
						{node.name}
					</button>
					<span class="tree-kind">{kindLabel(node)}</span>
				</div>
			</li>
		{/each}
	</ul>
</aside>

<style>
	.system-tree {
		flex-shrink: 0;
		overflow-y: auto;
		padding: 10px 12px 14px;
		background: rgba(8, 10, 20, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		color: #e8ecf8;
		font: 13px/1.4 system-ui, sans-serif;
		box-sizing: border-box;
	}

	h2 {
		margin: 0 0 6px;
		font-size: 14px;
		font-weight: 600;
	}

	.tree-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tree-row {
		margin: 2px 0;
		padding-left: calc(var(--depth) * 14px);
	}

	.tree-row.inactive {
		opacity: 0.55;
	}

	.tree-row.selected {
		background: rgba(107, 159, 255, 0.18);
		border-radius: 3px;
	}

	.tree-row.dragging {
		opacity: 0.4;
	}

	.tree-row.drag-over {
		outline: 1px dashed rgba(158, 192, 255, 0.7);
		outline-offset: -1px;
		border-radius: 3px;
	}

	.tree-row {
		cursor: grab;
	}

	.tree-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}

	.tree-chevron {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		padding: 0;
		border: none;
		background: none;
		color: #9ec0ff;
		font-size: 10px;
		line-height: 14px;
		cursor: pointer;
		transition: transform 0.12s ease;
	}

	.tree-chevron:not(.collapsed) {
		transform: rotate(90deg);
	}

	.tree-chevron-spacer {
		flex-shrink: 0;
		width: 14px;
	}

	.tree-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.tree-name:hover {
		color: #9ec0ff;
	}

	.tree-kind {
		opacity: 0.5;
		font-size: 11px;
		white-space: nowrap;
	}

	input[type='checkbox'] {
		accent-color: #6b9fff;
		flex-shrink: 0;
	}
</style>
