<script lang="ts">
	let { children } = $props();
</script>

<div class="old-shell">
	{@render children()}
</div>

<style>
	.old-shell {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
