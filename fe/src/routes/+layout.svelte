<script lang="ts">
	import { browser } from '$app/environment';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { injectUmami } from '$lib/analytics/umami';

	let { children } = $props();

	$effect(() => {
		if (browser) injectUmami();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<AppHeader />
	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
		background: #04060d;
		color: #e8ecf8;
	}

	.app-main {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
