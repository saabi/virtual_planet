<script lang="ts">
	import { PARAM_EDITOR_SECTIONS } from '../params/paramEditorSchema.js';
	import { PLANET_PRESETS, DEFAULT_PRESET, type PlanetPresetName } from '../params/presets.js';
	import { resolveBodyParams } from '../scene/bodyParams.js';
	import type { PlanetParameters } from '../params/planetParams.js';
	import type { BodyAppearance, BodyLod, BodyNode } from '../scene/types.js';
	import ParamSliderRow from './controls/ParamSliderRow.svelte';
	import EditorSubsection from './scene-editor/EditorSubsection.svelte';
	import './controls/sliderList.css';

	interface Props {
		body: BodyNode;
		onappearance?: (a: BodyAppearance) => void;
		onlod?: (l: BodyLod) => void;
	}
	let { body, onappearance, onlod }: Props = $props();

	const PRESETS = Object.keys(PLANET_PRESETS) as PlanetPresetName[];
	const shapeSections = PARAM_EDITOR_SECTIONS.filter((s) => s.group === 'shape');
	const materialSections = PARAM_EDITOR_SECTIONS.filter((s) => s.group === 'materials');

	const appearance = $derived<BodyAppearance>(body.appearance ?? { preset: DEFAULT_PRESET });
	const resolved = $derived(resolveBodyParams(body));
	const lod = $derived<BodyLod>(body.lod ?? {});

	function setPreset(preset: PlanetPresetName) {
		onappearance?.({ preset, overrides: appearance.overrides });
	}
	function setOverride(key: keyof PlanetParameters, value: number) {
		onappearance?.({ preset: appearance.preset, overrides: { ...appearance.overrides, [key]: value } });
	}
	function resetOverrides() {
		onappearance?.({ preset: appearance.preset });
	}

	function setLod(patch: Partial<BodyLod>) {
		onlod?.({ ...lod, ...patch });
	}

	const overrideCount = $derived(Object.keys(appearance.overrides ?? {}).length);
</script>

<div class="appearance">
	<div class="appr-head">
		<select
			class="preset"
			value={appearance.preset}
			onchange={(e) => setPreset(e.currentTarget.value as PlanetPresetName)}
		>
			{#each PRESETS as p (p)}
				<option value={p}>{p}</option>
			{/each}
		</select>
		<button type="button" class="reset" disabled={overrideCount === 0} onclick={resetOverrides}>
			reset {overrideCount || ''}
		</button>
	</div>

	{#each shapeSections as section (section.title)}
		<EditorSubsection title={section.title} defaultOpen={section.defaultOpen ?? false}>
			<ul class="slider-list">
				{#each section.sliders as sl (sl.key)}
					<ParamSliderRow
						id={String(sl.key)}
						slider={sl}
						value={resolved[sl.key]}
						onvalue={(v) => setOverride(sl.key, v)}
						variant="scene"
					/>
				{/each}
			</ul>
			{#each section.toggles ?? [] as toggle (toggle.key)}
				<label class="flag-row">
					<span class="flag-label">{toggle.label}</span>
					<input
						type="checkbox"
						checked={resolved[toggle.key] > 0.5}
						onchange={(e) => setOverride(toggle.key, e.currentTarget.checked ? 1 : 0)}
					/>
				</label>
			{/each}
		</EditorSubsection>
	{/each}

	{#each materialSections as section (section.title)}
		<EditorSubsection title={section.title} defaultOpen={section.defaultOpen ?? false}>
			<ul class="slider-list">
				{#each section.sliders as sl (sl.key)}
					<ParamSliderRow
						id={String(sl.key)}
						slider={sl}
						value={resolved[sl.key]}
						onvalue={(v) => setOverride(sl.key, v)}
						variant="scene"
					/>
				{/each}
			</ul>
		</EditorSubsection>
	{/each}

	<EditorSubsection title="LOD (projected px)">
		<label class="lod-row">
			<span class="lod-label">sphere above</span>
			<input
				type="number"
				step="any"
				value={lod.sphereAbovePx ?? 2}
				onchange={(e) => setLod({ sphereAbovePx: Number(e.currentTarget.value) })}
			/>
		</label>
		<label class="lod-row">
			<span class="lod-label">procedural above</span>
			<input
				type="number"
				step="any"
				value={lod.proceduralAbovePx ?? 240}
				onchange={(e) => setLod({ proceduralAbovePx: Number(e.currentTarget.value) })}
			/>
		</label>
	</EditorSubsection>
</div>

<style>
	.appearance {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.appr-head {
		display: flex;
		gap: 5px;
		margin-bottom: 4px;
	}

	.preset {
		flex: 1;
	}

	.flag-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		margin: 4px 0;
		font-size: 11px;
	}

	.flag-label {
		flex: 1;
		text-align: right;
		opacity: 0.8;
	}

	.lod-row {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		margin: 2px 0;
	}

	.lod-label {
		flex: 0 0 40%;
		min-width: 0;
		opacity: 0.8;
	}

	.lod-row input[type='number'] {
		flex: 1;
		min-width: 0;
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 2px 4px;
	}

	select.preset,
	.reset {
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 2px 4px;
		font-size: 11px;
		cursor: pointer;
	}

	.reset:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
