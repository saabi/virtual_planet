<script lang="ts">
	import { NAV_ITEMS, APP_TITLE } from '$lib/components/AppHeader.svelte';
</script>

<svelte:head>
	<title>{APP_TITLE}</title>
</svelte:head>

<div class="home">
	<h1>{APP_TITLE}</h1>
	<p class="tagline">Procedural planets, scene editor, and SunDog galaxy map.</p>
	<nav class="cards" aria-label="App sections">
		{#each NAV_ITEMS as item (item.href)}
			<a class="card" href={item.href}>
				<span class="card-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.home {
		box-sizing: border-box;
		height: 100%;
		padding: 2rem 1.5rem;
		overflow: auto;
	}

	h1 {
		margin: 0 0 0.5rem;
		font: 600 1.75rem/1.2 system-ui, sans-serif;
	}

	.tagline {
		margin: 0 0 1.5rem;
		color: #9aa6c4;
		font-size: 0.95rem;
		max-width: 36rem;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.75rem;
		max-width: 40rem;
	}

	.card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 4.5rem;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: #e8ecf8;
		text-decoration: none;
		font: 600 0.95rem system-ui, sans-serif;
	}

	.card:hover {
		border-color: rgba(158, 192, 255, 0.45);
		background: rgba(60, 90, 140, 0.35);
	}
</style>
