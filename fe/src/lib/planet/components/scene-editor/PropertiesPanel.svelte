<script module lang="ts">
	import type { NodeEditor } from '$lib/planet/scene/nodeSchemas.js';
	import { driverOutputs, driverSchemaFor } from '$lib/planet/scene/nodeSchemas.js';
	import type {
		BodyAppearance,
		BodyAtmosphere,
		BodyLod,
		BodyNode,
		Constraint,
		FieldTerm,
		PlanetScene,
		SceneNode,
		Transform
	} from '$lib/planet/scene/types.js';

	interface BreadcrumbCrumb {
		id: string;
		name: string;
	}

	interface Props {
		scene: PlanetScene;
		selectedId: string | null;
		selectedNode: SceneNode | null;
		evaluatedNode: SceneNode | null;
		breadcrumb: BreadcrumbCrumb[];
		editor: NodeEditor | null;
		schemaValue: Record<string, unknown>;
		bodyNode: BodyNode | null;
		hasAppearance: boolean;
		driverValue: Record<string, unknown>;
		onFieldChange?: (next: Record<string, unknown>) => void;
		onTransformChange?: (t: Transform) => void;
		onDriverChange?: (next: Record<string, unknown>) => void;
		onBindingsChange?: (next: FieldTerm[]) => void;
		onConstraintsChange?: (next: Constraint[]) => void;
		onAppearanceChange?: (a: BodyAppearance) => void;
		onLodChange?: (l: BodyLod) => void;
		onAtmosphereChange?: (a: BodyAtmosphere) => void;
		onRenderProcedural?: () => void;
		onOpenPlanet?: () => void;
		onOpenPlanetNewTab?: () => void;
	}
</script>

<script lang="ts">
	import SchemaForm from '$lib/planet/components/SchemaForm.svelte';
	import TransformEditor from '$lib/planet/components/TransformEditor.svelte';
	import BindingsEditor from '$lib/planet/components/BindingsEditor.svelte';
	import ConstraintsEditor from '$lib/planet/components/ConstraintsEditor.svelte';
	import AppearanceEditor from '$lib/planet/components/AppearanceEditor.svelte';
	import AtmosphereEditor from '$lib/planet/components/AtmosphereEditor.svelte';

	let {
		selectedId = $bindable(),
		selectedNode,
		evaluatedNode,
		breadcrumb,
		editor,
		schemaValue,
		bodyNode,
		hasAppearance,
		driverValue,
		onFieldChange,
		onTransformChange,
		onDriverChange,
		onBindingsChange,
		onConstraintsChange,
		onAppearanceChange,
		onLodChange,
		onAtmosphereChange,
		onRenderProcedural,
		onOpenPlanet,
		onOpenPlanetNewTab
	}: Props = $props();
</script>

<div class="properties-panel">
	{#if selectedNode}
		<nav class="breadcrumb" aria-label="Scene path">
			<button type="button" class="crumb" onclick={() => (selectedId = null)}>/</button>
			{#each breadcrumb as crumb (crumb.id)}
				<span class="crumb-sep">/</span>
				<button type="button" class="crumb" onclick={() => (selectedId = crumb.id)}>
					{crumb.name}
				</button>
			{/each}
		</nav>
		<div class="node-editor">
			<span class="edit-name">{selectedNode.name}</span>
			<TransformEditor
				node={selectedNode}
				evaluated={evaluatedNode ?? selectedNode}
				onchange={onTransformChange}
			/>
			{#if selectedNode.driver}
				<div class="driver-section">
					<span class="section-label">Driver · {selectedNode.driver.type}</span>
					<SchemaForm
						schema={driverSchemaFor(selectedNode.driver)}
						value={driverValue}
						onchange={onDriverChange}
					/>
					<span class="driver-outputs">
						outputs: {driverOutputs(selectedNode.driver).join(', ')}
					</span>
				</div>
			{/if}
			<div class="dataflow-section">
				<span class="section-label">Bindings</span>
				<BindingsEditor node={selectedNode} onchange={onBindingsChange} />
			</div>
			<div class="dataflow-section">
				<span class="section-label">Constraints</span>
				<ConstraintsEditor node={selectedNode} onchange={onConstraintsChange} />
			</div>
			{#if editor?.mode === 'schema'}
				<SchemaForm schema={editor.schema} value={schemaValue} onchange={onFieldChange} />
			{/if}
			{#if bodyNode && hasAppearance}
				<div class="appearance-section">
					<span class="section-label">Appearance</span>
					<AppearanceEditor
						body={bodyNode}
						onappearance={onAppearanceChange}
						onlod={onLodChange}
					/>
					<span class="section-label">Atmosphere</span>
					<AtmosphereEditor body={bodyNode} onatmosphere={(a) => onAtmosphereChange?.(a)} />
					<button type="button" class="render-btn" onclick={onRenderProcedural}>
						Render procedurally →
					</button>
					<div class="editor-handoff">
						<button type="button" class="edit-link" onclick={onOpenPlanet}>
							Edit in /planet →
						</button>
						<button
							type="button"
							class="edit-link new-tab"
							title="Open in a new tab (compare side by side)"
							aria-label="Open in planet editor in a new tab"
							onclick={onOpenPlanetNewTab}
						>
							↗
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<p class="empty-state">Select a node in the outliner or viewport to edit its properties.</p>
	{/if}
</div>

<style>
	.properties-panel {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 10px;
		height: 100%;
		overflow-y: auto;
		padding: 12px;
	}

	.empty-state {
		margin: 0;
		font-size: 11px;
		opacity: 0.6;
	}

	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		font-size: 11px;
		opacity: 0.85;
	}

	.crumb {
		background: none;
		border: none;
		padding: 0 1px;
		color: #9ec0ff;
		cursor: pointer;
		font: inherit;
	}

	.crumb:hover {
		text-decoration: underline;
	}

	.crumb-sep {
		opacity: 0.4;
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

	.driver-section {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 6px 8px;
		background: rgba(124, 92, 255, 0.08);
		border: 1px solid rgba(124, 92, 255, 0.25);
		border-radius: 6px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		color: #c7a6ff;
	}

	.dataflow-section {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
	}

	.dataflow-section .section-label {
		color: #aab2c8;
	}

	.appearance-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 6px 8px;
		background: rgba(110, 160, 120, 0.08);
		border: 1px solid rgba(110, 160, 120, 0.22);
		border-radius: 6px;
	}

	.appearance-section .section-label {
		color: #9fcfae;
	}

	.render-btn {
		align-self: flex-start;
		margin-top: 4px;
		font: 11px/1.2 system-ui, sans-serif;
		padding: 3px 10px;
		border-radius: 4px;
		border: 1px solid rgba(110, 160, 120, 0.4);
		background: rgba(110, 160, 120, 0.15);
		color: #cfedd6;
		cursor: pointer;
	}

	.driver-outputs {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		opacity: 0.6;
	}

	.editor-handoff {
		display: flex;
		align-items: stretch;
		gap: 4px;
		margin-top: 2px;
	}

	.edit-link {
		font: 11px/1.2 system-ui, sans-serif;
		padding: 3px 10px;
		border-radius: 4px;
		border: 1px solid rgba(158, 192, 255, 0.4);
		background: rgba(158, 192, 255, 0.12);
		color: #cfe0ff;
		cursor: pointer;
	}

	.edit-link:hover {
		background: rgba(158, 192, 255, 0.22);
	}

	.edit-link.new-tab {
		padding: 3px 8px;
	}
</style>
