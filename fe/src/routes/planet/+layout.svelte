<script lang="ts">
	let { children } = $props();
</script>

<div class="planet-shell">
	{@render children()}
</div>

<style>
	.planet-shell {
		position: relative;
		width: 100%;
		height: 100dvh;
		overflow: hidden;
	}
</style>
