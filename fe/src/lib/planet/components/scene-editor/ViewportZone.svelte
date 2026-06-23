<script module lang="ts">
	import type { MaterialDebugMode } from '$lib/planet/material/biomes.js';
	import type { OrbitLookMode } from '$lib/planet/camera/orbitCamera.js';
	import type { BodyNode, PlanetScene } from '$lib/planet/scene/types.js';

	interface Props {
		scene: PlanetScene;
		selectedId: string | null;
		clock: number;
		playing: boolean;
		speed: number;
		materialDebug: MaterialDebugMode;
		lookMode: OrbitLookMode;
		focusedBody: BodyNode | null;
		onCloseFocused?: () => void;
	}
</script>

<script lang="ts">
	import SceneViewport3D from '$lib/planet/components/SceneViewport3D.svelte';
	import SystemMapPanel from '$lib/planet/components/SystemMapPanel.svelte';
	import FocusedBodyView from '$lib/planet/components/FocusedBodyView.svelte';

	let {
		scene,
		selectedId = $bindable(),
		clock = $bindable(),
		playing = $bindable(),
		speed = $bindable(),
		materialDebug,
		lookMode,
		focusedBody,
		onCloseFocused
	}: Props = $props();
</script>

<div class="viewport-zone">
	<SceneViewport3D {scene} bind:selectedId time={clock} {materialDebug} {lookMode} />
	<div class="map-inset">
		<SystemMapPanel {scene} bind:selectedId time={clock} bind:playing bind:speed />
	</div>
	{#if focusedBody}
		<FocusedBodyView body={focusedBody} onclose={onCloseFocused} />
	{/if}
</div>

<style>
	.viewport-zone {
		position: relative;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		box-sizing: border-box;
		padding: 12px;
	}

	/* 2D map as an inset minimap over the 3D view (doubles as the HUD-element use). */
	.map-inset {
		position: absolute;
		right: 18px;
		bottom: 18px;
		width: 300px;
		max-width: 40%;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
		border-radius: 8px;
	}

	.map-inset :global(.map-canvas) {
		height: 180px;
	}
</style>
