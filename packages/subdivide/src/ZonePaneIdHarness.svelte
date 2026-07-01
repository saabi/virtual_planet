<script lang="ts">
	import Subdivide from './Subdivide.svelte';
	import { createDefaultLayout } from './layout/defaultLayout.js';
	import type { LayoutDocument } from './layout/types.js';

	let layout = $state<LayoutDocument>(createDefaultLayout('main'));
</script>

{#snippet main(paneId)}
	<div data-testid="zone-content" data-pane-id={paneId}>Main</div>
{/snippet}

<div class="harness">
	<Subdivide bind:layout zones={{ main }} zoneLabels={{ main: 'Main' }} />
</div>

<style>
	.harness {
		position: relative;
		width: 400px;
		height: 300px;
	}
</style>
