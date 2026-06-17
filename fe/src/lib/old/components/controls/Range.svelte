<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min: number | string;
		max: number | string;
		step: number | string;
	}

	let { label, value = $bindable(), min, max, step }: Props = $props();

	function format(n: number, stepVal: number | string) {
		const precision = Math.log10(Number(stepVal));
		if (precision < 0) {
			const factor = Math.pow(10, -precision);
			return Math.round(n * factor) / factor;
		}
		return n;
	}

	let formatted_value = $derived(format(value, step));
</script>

<style>
	label {
		display: inline-block;
		width: 5em;
		text-align: right;
		margin: 0 10px;
	}
	data {
		display: inline-block;
		width: 3em;
		text-align: right;
		color: #0f0;
		background: rgba(64, 64, 64, 0.5);
		padding: 0 0.5em;
		margin: 1px;
	}
	input {
		-webkit-appearance: none;
		margin: 0 10px;
		width: 128px;
		background: transparent;
	}
	input:focus {
		outline: none;
	}
	input::-webkit-slider-runnable-track {
		-webkit-appearance: none;
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: #555;
		border-radius: 4px;
		border: thin inset #555;
	}
	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		border: thin outset #bbb;
		margin-top: -3.6px;
		width: 8px;
		height: 10px;
		border-radius: 4px;
		background: #bbb;
		cursor: ew-resize;
	}
	input:focus::-webkit-slider-runnable-track {
		background: #775;
	}
	input::-moz-range-track {
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: #555;
		border-radius: 4px;
		border: thin inset #555;
	}
	input::-moz-range-thumb {
		border: thin outset #bbb;
		width: 8px;
		height: 10px;
		border-radius: 4px;
		background: #bbb;
		cursor: ew-resize;
	}
</style>

<label>{label}</label>
<input type="range" {min} {max} {step} bind:value />
<data>{formatted_value}</data>
