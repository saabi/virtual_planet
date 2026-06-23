<script module lang="ts">
	import {
		MATERIAL_DEBUG_LABELS,
		type MaterialDebugMode
	} from '$lib/planet/material/biomes.js';
	import type { OrbitLookMode } from '$lib/planet/camera/orbitCamera.js';
	import type { SceneViewportPrefs } from '$lib/planet/scene/viewportPrefs.js';

	interface Props {
		materialDebug: MaterialDebugMode;
		lookMode: OrbitLookMode;
		viewportPrefs: SceneViewportPrefs;
	}
</script>

<script lang="ts">
	import EditorAccordionSection from './EditorAccordionSection.svelte';
	import EditorSubsection from './EditorSubsection.svelte';

	let {
		materialDebug = $bindable(),
		lookMode = $bindable(),
		viewportPrefs = $bindable()
	}: Props = $props();

	type RenderSuperSectionId = 'view' | 'quality' | 'debug' | 'shading';

	const RENDER_SECTIONS: { id: RenderSuperSectionId; title: string; defaultOpen?: boolean }[] = [
		{ id: 'view', title: 'View', defaultOpen: true },
		{ id: 'quality', title: 'Quality' },
		{ id: 'debug', title: 'Debug' },
		{ id: 'shading', title: 'Shading' }
	];

	let openSuperSection = $state<RenderSuperSectionId>('view');

	function onSuperToggle(id: RenderSuperSectionId) {
		openSuperSection = id;
	}
</script>

<div class="render-settings-panel">
	<div class="super-sections">
		{#each RENDER_SECTIONS as section (section.id)}
			<EditorAccordionSection
				title={section.title}
				open={openSuperSection === section.id}
				onToggle={() => onSuperToggle(section.id)}
			>
				{#if section.id === 'view'}
					<EditorSubsection title="Look" defaultOpen>
						<label class="atmo-head">
							<input
								type="checkbox"
								checked={lookMode === 'horizon'}
								onchange={(e) =>
									(lookMode = e.currentTarget.checked ? 'horizon' : 'planet-center')}
							/>
							Horizon look
						</label>
					</EditorSubsection>
					<EditorSubsection title="Material view" defaultOpen>
						<label class="atmo-row">
							<span>debug view</span>
							<select bind:value={materialDebug}>
								{#each MATERIAL_DEBUG_LABELS as opt (opt.value)}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</label>
					</EditorSubsection>
				{:else if section.id === 'quality'}
					<EditorSubsection title="Tessellation" defaultOpen>
						<label class="atmo-row">
							<span>detail</span>
							<input
								type="range"
								min="0.05"
								max="4"
								step="0.05"
								bind:value={viewportPrefs.tessellation.detail}
							/>
						</label>
						<label class="atmo-row">
							<span>vertex budget (M)</span>
							<input
								type="range"
								min="0.05"
								max="32"
								step="0.05"
								bind:value={viewportPrefs.tessellation.vertexBudgetMillions}
							/>
						</label>
						<label class="atmo-row">
							<span>max resolution</span>
							<select
								value={viewportPrefs.tessellation.maxPatchResolution}
								onchange={(e) =>
									(viewportPrefs.tessellation.maxPatchResolution = Number(
										e.currentTarget.value
									) as SceneViewportPrefs['tessellation']['maxPatchResolution'])}
							>
								<option value={0}>Auto</option>
								<option value={8}>8</option>
								<option value={16}>16</option>
								<option value={32}>32</option>
								<option value={64}>64</option>
								<option value={96}>96</option>
							</select>
						</label>
						<label class="atmo-row">
							<span>max depth</span>
							<select
								value={viewportPrefs.tessellation.maxDepth}
								onchange={(e) =>
									(viewportPrefs.tessellation.maxDepth = Number(
										e.currentTarget.value
									) as SceneViewportPrefs['tessellation']['maxDepth'])}
							>
								<option value={0}>Auto</option>
								<option value={3}>3</option>
								<option value={4}>4</option>
								<option value={5}>5</option>
								<option value={6}>6</option>
							</select>
						</label>
					</EditorSubsection>
				{:else if section.id === 'debug'}
					<EditorSubsection title="Overlays" defaultOpen>
						<label class="atmo-head">
							<input type="checkbox" bind:checked={viewportPrefs.debug.wireframe} />
							Wireframe
						</label>
						<label class="atmo-head">
							<input type="checkbox" bind:checked={viewportPrefs.debug.faceColors} />
							Face colors
						</label>
						<label class="atmo-head">
							<input type="checkbox" bind:checked={viewportPrefs.debug.showPatchBorders} />
							Patch borders
						</label>
						<label class="atmo-head">
							<input type="checkbox" bind:checked={viewportPrefs.debug.showRingColors} />
							Ring colors
						</label>
					</EditorSubsection>
				{:else if section.id === 'shading'}
					<EditorSubsection title="Scene shading" defaultOpen>
						<label class="atmo-head">
							<input type="checkbox" bind:checked={viewportPrefs.materialOverrides.shadows} />
							Shadows
						</label>
						<label class="atmo-row">
							<span>shadow fill</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								bind:value={viewportPrefs.materialOverrides.shadowFill}
							/>
						</label>
						<label class="atmo-row">
							<span>exposure</span>
							<input
								type="range"
								min="0.5"
								max="3"
								step="0.05"
								bind:value={viewportPrefs.materialOverrides.exposure}
							/>
						</label>
						<label class="atmo-row">
							<span>roughness</span>
							<input
								type="range"
								min="0.5"
								max="2"
								step="0.05"
								bind:value={viewportPrefs.materialOverrides.roughnessMult}
							/>
						</label>
						<label class="atmo-row">
							<span>water gloss</span>
							<input
								type="range"
								min="0.5"
								max="3"
								step="0.05"
								bind:value={viewportPrefs.materialOverrides.waterGloss}
							/>
						</label>
						<label class="atmo-row">
							<span>aerial fog</span>
							<input
								type="range"
								min="0"
								max="2"
								step="0.05"
								bind:value={viewportPrefs.materialOverrides.fogDensity}
							/>
						</label>
					</EditorSubsection>
				{/if}
			</EditorAccordionSection>
		{/each}
	</div>
</div>

<style>
	.render-settings-panel {
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
		padding: 12px;
	}

	.super-sections {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.atmo-head {
		display: flex;
		align-items: center;
		gap: 5px;
		font-weight: 600;
		font-size: 11px;
		color: #c7a6ff;
		margin: 2px 0;
	}

	.atmo-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		margin: 2px 0;
	}

	.atmo-row span {
		flex: 0 0 38%;
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
	}

	.atmo-row select,
	.atmo-row input[type='range'] {
		flex: 1;
		min-width: 0;
	}
</style>
