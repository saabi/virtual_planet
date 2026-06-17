<script module lang="ts">
	let lastId = 0;

	function autoID() {
		return 's-threeview' + lastId++;
	}
</script>

<script lang="ts">
	import * as THREE from 'three';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { Scene, PerspectiveCamera } from 'three';

	interface Props {
		scene: Scene | undefined;
		camera: PerspectiveCamera | undefined;
		update: ((time: number) => void) | undefined;
		run: boolean;
		onCanvas?: (canvas: HTMLCanvasElement) => void;
	}

	let { scene, camera, update, run, onCanvas }: Props = $props();

	const canvasId = autoID();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let renderer = $state<THREE.WebGLRenderer | null>(null);

	let lastResize = 0;
	let lastSize = { w: 0, h: 0 };
	let frame = 0;

	function render(time: number, looping: boolean) {
		if (!canvas || !renderer) return;

		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		if (width !== lastSize.w || height !== lastSize.h) {
			lastResize = Date.now();
			if (camera) {
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
			}
		} else if (!looping || (lastResize && lastResize + 100 < Date.now())) {
			renderer.setSize(width, height, false);
			lastResize = 0;
		}
		lastSize.w = width;
		lastSize.h = height;

		update?.(time);

		if (scene && camera) {
			renderer.render(scene, camera);
		}
	}

	function loop(time: number) {
		if (run) {
			frame = requestAnimationFrame(loop);
		}
		render(time, true);
	}

	function runOrNot(active: boolean) {
		if (!browser) return;
		if (active) {
			frame = requestAnimationFrame(loop);
		} else {
			cancelAnimationFrame(frame);
		}
	}

	$effect(() => {
		runOrNot(run);
	});

	onMount(() => {
		if (!canvas) return;

		onCanvas?.(canvas);

		const w = canvas.clientWidth;
		const h = canvas.clientHeight;

		renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(w, h, false);

		return () => cancelAnimationFrame(frame);
	});
</script>

<style>
	canvas {
		width: 100%;
		height: 100%;
	}
</style>

<canvas bind:this={canvas} id={canvasId}></canvas>
