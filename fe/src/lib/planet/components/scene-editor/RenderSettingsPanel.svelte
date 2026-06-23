<script module lang="ts">
	import {
		MATERIAL_DEBUG_LABELS,
		type MaterialDebugMode
	} from '$lib/planet/material/biomes.js';
	import type { OrbitLookMode } from '$lib/planet/camera/orbitCamera.js';

	interface Props {
		materialDebug: MaterialDebugMode;
		lookMode: OrbitLookMode;
	}
</script>

<script lang="ts">
	let { materialDebug = $bindable(), lookMode = $bindable() }: Props = $props();
</script>

<div class="render-settings-panel">
	<div class="atmo-debug">
		<span class="view-debug-label">View / debug</span>
		<label class="atmo-row">
			<span>debug view</span>
			<select bind:value={materialDebug}>
				{#each MATERIAL_DEBUG_LABELS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label class="atmo-head">
			<input
				type="checkbox"
				checked={lookMode === 'horizon'}
				onchange={(e) => (lookMode = e.currentTarget.checked ? 'horizon' : 'planet-center')}
			/> Horizon look
		</label>
	</div>
	<!-- Future: tessellation / quality knobs -->
</div>

<style>
	.render-settings-panel {
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
		padding: 12px;
	}

	.atmo-debug {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 6px 8px;
		background: rgba(124, 92, 255, 0.06);
		border: 1px solid rgba(124, 92, 255, 0.2);
		border-radius: 6px;
		font-size: 11px;
	}

	.atmo-head {
		display: flex;
		align-items: center;
		gap: 5px;
		font-weight: 600;
		color: #c7a6ff;
	}

	.atmo-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.atmo-row span {
		flex: 0 0 38%;
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
	}

	.view-debug-label {
		font-weight: 600;
		color: #c7a6ff;
	}
</style>
