<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<style>
		:global(html),
		:global(body) {
			margin: 0;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}
	</style>
</svelte:head>

<div class="old-shell">
	{@render children()}
</div>

<style>
	.old-shell {
		position: relative;
		width: 100%;
		height: 100dvh;
		overflow: hidden;
	}
</style>
