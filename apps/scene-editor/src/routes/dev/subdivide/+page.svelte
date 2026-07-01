<script lang="ts">
	import Subdivide from '@virtual-planet/subdivide/Subdivide.svelte';
	import { createDefaultLayout } from '@virtual-planet/subdivide';
	import type { LayoutDocument } from '@virtual-planet/subdivide';

	let layout = $state<LayoutDocument>(createDefaultLayout('main'));

	const zoneLabels = {
		main: 'Main',
		side: 'Side',
		bottom: 'Bottom'
	};
</script>

{#snippet main(_paneId: string)}
	<div class="zone main">
		<h2>Main</h2>
		<p>Cmd/Ctrl+drag an edge to split. Drag dividers to resize.</p>
	</div>
{/snippet}

{#snippet side(_paneId: string)}
	<div class="zone side">
		<h2>Side</h2>
		<p>Use the header dropdown to swap zones.</p>
	</div>
{/snippet}

{#snippet bottom(_paneId: string)}
	<div class="zone bottom">
		<h2>Bottom</h2>
	</div>
{/snippet}

<div class="page">
	<Subdivide
		bind:layout
		zones={{ main, side, bottom }}
		{zoneLabels}
		thickness="2px"
		padding="8px"
		color="#888"
	/>
</div>

<style>
	.page {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #1a1a1a;
		color: #eee;
	}

	.zone {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 1.5rem 1rem 1rem;
	}

	.main {
		background: #2a3a4a;
	}

	.side {
		background: #3a2a4a;
	}

	.bottom {
		background: #2a4a3a;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	p {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.85;
	}
</style>
