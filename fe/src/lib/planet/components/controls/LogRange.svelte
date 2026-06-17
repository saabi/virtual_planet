<script lang="ts">
	import { mapLogSlider, unmapLogSlider } from '../../camera/seaLevel.js';

	interface Props {
		id?: string;
		label: string;
		value: number;
		min: number;
		max: number;
	}

	let { id, label, value = $bindable(), min, max }: Props = $props();
	const inputId = id ?? label;

	let sliderT = $state(0);

	$effect(() => {
		sliderT = unmapLogSlider(value, min, max);
	});

	function onSliderInput(e: Event) {
		const t = Number((e.currentTarget as HTMLInputElement).value);
		value = mapLogSlider(t, min, max);
	}

	function formatMeters(n: number): string {
		if (n >= 10_000) return `${(n / 1000).toFixed(1)} km`;
		if (n >= 1000) return `${(n / 1000).toFixed(2)} km`;
		if (n >= 100) return `${Math.round(n)} m`;
		if (n >= 10) return `${n.toFixed(1)} m`;
		return `${n.toFixed(2)} m`;
	}

	let formattedValue = $derived(formatMeters(value));
</script>

<li class="range-row">
	<label class="range-label" for={inputId}>{label}</label>
	<input
		class="range-input"
		id={inputId}
		type="range"
		min={0}
		max={1}
		step={0.001}
		value={sliderT}
		oninput={onSliderInput}
	/>
	<data class="range-value">{formattedValue}</data>
</li>

<style>
	.range-row {
		list-style: none;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 2px 0;
	}

	.range-label {
		flex: 0 0 5em;
		text-align: right;
		font-size: 12px;
	}

	.range-value {
		flex: 0 0 4.5em;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		color: #9ecfff;
		background: rgba(26, 31, 48, 0.9);
		padding: 0 0.4em;
		border-radius: 3px;
	}

	.range-input {
		flex: 1;
		min-width: 0;
		max-width: 140px;
		-webkit-appearance: none;
		background: transparent;
	}

	.range-input:focus {
		outline: none;
	}

	.range-input::-webkit-slider-runnable-track {
		-webkit-appearance: none;
		height: 4px;
		cursor: pointer;
		background: #3a4258;
		border-radius: 4px;
	}

	.range-input::-webkit-slider-thumb {
		-webkit-appearance: none;
		margin-top: -4px;
		width: 10px;
		height: 12px;
		border-radius: 4px;
		background: #c8d4f0;
		border: 1px solid rgba(255, 255, 255, 0.2);
		cursor: ew-resize;
	}

	.range-input:focus::-webkit-slider-runnable-track {
		background: #4a5878;
	}

	.range-input::-moz-range-track {
		height: 4px;
		cursor: pointer;
		background: #3a4258;
		border-radius: 4px;
	}

	.range-input::-moz-range-thumb {
		width: 10px;
		height: 12px;
		border-radius: 4px;
		background: #c8d4f0;
		border: 1px solid rgba(255, 255, 255, 0.2);
		cursor: ew-resize;
	}
</style>
