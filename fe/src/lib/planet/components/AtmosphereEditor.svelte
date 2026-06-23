<script lang="ts">
	import { resolveBodyAtmosphere } from '../scene/bodyAtmosphere.js';
	import type { BodyAtmosphere, BodyNode } from '../scene/types.js';

	// Per-body atmosphere *design* editor (planet/moon). Atmosphere is body data
	// (body-vs-viewport-state.md); the ray-march step count is render quality, edited
	// elsewhere, not here. Strengths are radius-invariant (normalized by R_ref/radius at
	// upload), so an authored value reads the same at any body size.

	interface Props {
		body: BodyNode;
		onatmosphere: (a: BodyAtmosphere) => void;
	}
	let { body, onatmosphere }: Props = $props();

	const current = $derived(resolveBodyAtmosphere(body));
	function set(patch: Partial<BodyAtmosphere>) {
		onatmosphere({ ...current, ...patch });
	}
</script>

<div class="atmo-editor">
	<label class="atmo-head">
		<input
			type="checkbox"
			checked={current.enabled}
			onchange={(e) => set({ enabled: e.currentTarget.checked })}
		/> Enabled
	</label>
	<label class="atmo-row">
		<span>rayleigh {current.rayleighStrength.toFixed(2)}</span>
		<input
			type="range"
			min="0"
			max="2"
			step="0.01"
			value={current.rayleighStrength}
			oninput={(e) => set({ rayleighStrength: e.currentTarget.valueAsNumber })}
		/>
	</label>
	<label class="atmo-row">
		<span>mie {current.mieStrength.toFixed(2)}</span>
		<input
			type="range"
			min="0"
			max="2"
			step="0.01"
			value={current.mieStrength}
			oninput={(e) => set({ mieStrength: e.currentTarget.valueAsNumber })}
		/>
	</label>
	<label class="atmo-row">
		<span>mie g {current.mieG.toFixed(2)}</span>
		<input
			type="range"
			min="0"
			max="0.95"
			step="0.01"
			value={current.mieG}
			oninput={(e) => set({ mieG: e.currentTarget.valueAsNumber })}
		/>
	</label>
	<label class="atmo-row">
		<span>fog {current.groundFogDensity.toFixed(2)}</span>
		<input
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={current.groundFogDensity}
			oninput={(e) => set({ groundFogDensity: e.currentTarget.valueAsNumber })}
		/>
	</label>
	<label class="atmo-row">
		<span>sun disk {current.sunDiskIntensity.toFixed(0)}</span>
		<input
			type="range"
			min="0"
			max="60"
			step="1"
			value={current.sunDiskIntensity}
			oninput={(e) => set({ sunDiskIntensity: e.currentTarget.valueAsNumber })}
		/>
	</label>
</div>

<style>
	.atmo-editor {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.atmo-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font: 11px/1.2 system-ui, sans-serif;
		color: #cfe0ff;
	}
	.atmo-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font: 10px/1.2 system-ui, sans-serif;
		color: #b9c6e0;
	}
	.atmo-row input[type='range'] {
		width: 100%;
	}
</style>
