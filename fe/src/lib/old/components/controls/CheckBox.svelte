<script lang="ts">
	interface Props {
		label: string;
		checked: boolean;
		disabled?: boolean;
	}

	let { label, checked = $bindable(), disabled = false }: Props = $props();
</script>

<style>
	label {
		display: inline-block;
		width: calc(5em + 150px);
		text-align: right;
		margin: 0 10px;
	}
	input {
		display: inline-block;
		width: 3em;
		text-align: right;
		color: #0f0;
		background: rgba(64, 64, 64, 0.5);
		margin: 1px calc(1px + 0.5em);
	}
</style>

<label>{label}</label>
<input type="checkbox" bind:checked {disabled} />
