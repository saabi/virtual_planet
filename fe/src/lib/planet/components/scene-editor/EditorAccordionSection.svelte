<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		open = false,
		onToggle,
		children
	}: {
		title: string;
		open?: boolean;
		onToggle?: () => void;
		children: Snippet;
	} = $props();

	const contentId = $derived(`scene-acc-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
</script>

<section class="acc-section" class:open>
	<button
		type="button"
		class="acc-header"
		aria-expanded={open}
		aria-controls={contentId}
		onclick={() => onToggle?.()}
	>
		<span class="acc-chevron" aria-hidden="true">▸</span>
		<span class="acc-title">{title}</span>
	</button>
	{#if open}
		<div id={contentId} class="acc-body">
			{@render children()}
		</div>
	{/if}
</section>

<style>
	.acc-section {
		margin: 4px 0;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		overflow: hidden;
		background: rgba(8, 10, 20, 0.5);
	}

	.acc-header {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 6px 10px;
		border: none;
		background: rgba(255, 255, 255, 0.04);
		color: #e8ecf8;
		font: 600 12px/1.3 system-ui, sans-serif;
		cursor: pointer;
		text-align: left;
	}

	.acc-header:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.acc-chevron {
		font-size: 10px;
		color: #9ec0ff;
		transition: transform 0.12s ease;
	}

	.acc-section.open .acc-chevron {
		transform: rotate(90deg);
	}

	.acc-title {
		color: #c7a6ff;
	}

	.acc-body {
		padding: 4px 8px 8px;
	}
</style>
