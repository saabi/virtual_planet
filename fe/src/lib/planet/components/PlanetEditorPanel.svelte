<script lang="ts">
	import type { PlanetParameters } from '../params/planetParams.js';
	import { PLANET_PRESETS, type PlanetPresetName } from '../params/presets.js';
	import { PARAM_EDITOR_SECTIONS } from '../params/paramEditorSchema.js';
	import Range from './controls/Range.svelte';
	import CheckBox from './controls/CheckBox.svelte';

	interface Props {
		params: PlanetParameters;
		presetName: PlanetPresetName;
		wireframe: boolean;
	}

	let { params = $bindable(), presetName = $bindable(), wireframe = $bindable() }: Props =
		$props();

	const presetNames = Object.keys(PLANET_PRESETS) as PlanetPresetName[];
</script>

<aside class="editor-panel" aria-label="Planet parameter editor">
	<ul class="editor-list">
		<li><header>Planet</header></li>
		<li class="preset-row">
			<label class="preset-label" for="planet-preset">Presets</label>
			<select id="planet-preset" class="preset-select" bind:value={presetName}>
				{#each presetNames as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
			<data class="preset-name">{presetName}</data>
		</li>

		{#each PARAM_EDITOR_SECTIONS as section (section.title)}
			{#if section.title !== 'Planet'}
				<li><header>{section.title}</header></li>
			{/if}
			{#each section.sliders as slider (slider.key)}
				<Range
					id={slider.key}
					label={slider.label}
					min={slider.min}
					max={slider.max}
					step={slider.step}
					bind:value={params[slider.key]}
				/>
			{/each}
		{/each}

		<li><header>Rendering</header></li>
		<CheckBox id="wireframe" label="Wireframe" bind:checked={wireframe} />
		<li class="flag-row">
			<label class="flag-label" for="illumination">Illumination</label>
			<input
				id="illumination"
				class="flag-input"
				type="checkbox"
				checked={params.illumination > 0.5}
				onchange={(e) => (params.illumination = e.currentTarget.checked ? 1 : 0)}
			/>
		</li>
		<li class="flag-row">
			<label class="flag-label" for="render-water">Render Water</label>
			<input
				id="render-water"
				class="flag-input"
				type="checkbox"
				checked={params.render_water > 0.5}
				onchange={(e) => (params.render_water = e.currentTarget.checked ? 1 : 0)}
			/>
		</li>
	</ul>
</aside>

<style>
	.editor-panel {
		position: absolute;
		top: 0;
		right: 0;
		max-height: 100%;
		overflow-x: visible;
		overflow-y: auto;
		padding: 10px 12px 16px;
		background: rgba(8, 10, 20, 0.88);
		border-left: 1px solid rgba(255, 255, 255, 0.12);
		color: #e8ecf8;
		font: 13px/1.4 system-ui, sans-serif;
		min-width: 280px;
		max-width: 320px;
		box-sizing: border-box;
	}

	.editor-list {
		margin: 0;
		padding: 0;
	}

	.editor-list > li {
		list-style: none;
	}

	header {
		display: block;
		background: rgba(92, 60, 0, 0.45);
		margin: 6px 0 4px;
		padding: 3px 10px;
		color: #f0e6d8;
		font-size: 12px;
		font-weight: 600;
		border-radius: 3px;
	}

	.preset-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.preset-label {
		flex: 0 0 5em;
		text-align: right;
		font-size: 12px;
	}

	.preset-select {
		flex: 1;
		min-width: 0;
		max-width: 128px;
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 2px 4px;
	}

	.preset-name {
		flex: 0 0 4em;
		text-align: right;
		font-size: 11px;
		color: #9ecfff;
		font-variant-numeric: tabular-nums;
	}

	.flag-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin: 4px 0;
		padding-right: 4px;
	}

	.flag-label {
		flex: 1;
		text-align: right;
		font-size: 12px;
	}

	.flag-input {
		accent-color: #6b9fff;
	}
</style>
