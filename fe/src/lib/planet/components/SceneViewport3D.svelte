<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { requestWebGPUDevice, configureWebGPUCanvas } from '../render/device.js';
	import { SceneEngine } from '../scene3d/sceneEngine.js';
	import { SpherePass, type BodyInstance, type SceneLighting } from '../scene3d/spherePass.js';
	import {
		clampElevation,
		FOVY,
		projectToScreen,
		viewProjection,
		type OrbitCamera
	} from '../scene3d/orbitCamera.js';
	import { evaluateScene } from '../scene/driver.js';
	import { getWorldTransform, listBodies } from '../scene/sceneTree.js';
	import { collectSceneLights } from '../scene/collectLights.js';
	import { packSceneLighting } from '../scene/packLighting.js';
	import type { LodLevel } from '../scene/bodyParams.js';
	import { buildDrawList, type DrawItem } from '../scene3d/drawList.js';
	import { buildProceduralRenderInput } from '../scene3d/proceduralRender.js';
	import { SceneAtmospherePass } from '../scene3d/sceneAtmospherePass.js';
	import { PlanetRenderer } from '../render/planetRenderer.js';
	import { WebGPUBackend } from '../render/WebGPUBackend.js';
	import { invert4 } from '../math/mat4.js';
	import { resolveBodyAtmosphere, bodyAtmosphereToParameters } from '../scene/bodyAtmosphere.js';
	import { toGpuAtmosphereParams } from '../params/atmosphereParams.js';
	import { normalize3, sub3, type Vec3 } from '../math/vec.js';
	import type { LightingUniforms } from '../render/uniformLayouts.js';
	import type { BodyNode, PlanetScene, Quat } from '../scene/types.js';
	import {
		isSceneAtmosphereDebugMode,
		sceneAtmosphereDebugToGpu,
		sceneMaterialDebugMode,
		type SceneDebugMode
	} from '../scene/sceneDebug.js';
	import type { OrbitLookMode } from '../camera/orbitCamera.js';
	import { viewportPrefsRenderDeps, type SceneViewportPrefs } from '../scene/viewportPrefs.js';

	interface Props {
		scene: PlanetScene;
		selectedId?: string | null;
		/** Shared animation clock; re-renders as it advances (driven by the 2D map loop). */
		time?: number;
		/** Material debug view for the procedural layer (parity diagnostic). */
		materialDebug?: SceneDebugMode;
		/** Focused-body look mode (viewport state). */
		lookMode?: OrbitLookMode;
		/** Tessellation, debug overlays, and material overrides (session viewport prefs). */
		viewportPrefs?: SceneViewportPrefs;
	}
	let {
		scene,
		selectedId = $bindable(null),
		time = 0,
		materialDebug = 'off',
		lookMode = 'planet-center',
		viewportPrefs = $bindable()
	}: Props = $props();
	let atmosphereDebugActive = $derived(isSceneAtmosphereDebugMode(materialDebug));
	let atmosphereOnWhite = $derived(materialDebug === 'atmosphereWhite');

	let canvas = $state<HTMLCanvasElement | null>(null);
	let w = $state(1);
	let h = $state(1);
	let failed = $state<string | null>(null);
	/** Selection ring overlay (screen px), null when nothing is selected/visible. */
	let marker = $state<{ x: number; y: number; r: number } | null>(null);
	/** Procedural cross-fade: the selected planet/moon (stable ref) + its blend 0..1. */
	let procBody = $state<BodyNode | null>(null);
	let procBlend = $state(0);
	/** The selected body's live world position, for the layer's world-coord render. */
	let procWorldPos = $state<Vec3>([0, 0, 0]);
	/** The selected body's evaluated body-space rotation (spin/tilt), for terrain sampling. */
	let procRotation = $state<Quat>([0, 0, 0, 1]);
	/** Feathered disc (screen px) to mask the procedural layer to its planet + atmosphere,
	 *  so the rest of the layer is transparent and the scene shows through. */
	let procMask = $state<{ x: number; y: number; r0: number; r1: number } | null>(null);
	/** Packed lighting for the procedural layer: the sun as a directional light toward Sol. */
	let procLighting = $state<LightingUniforms>(packSceneLighting({ ambient: [0, 0, 0], lights: [] }));

	let device = $state<GPUDevice | null>(null);
	let context: GPUCanvasContext | null = null;
	let format: GPUTextureFormat = 'bgra8unorm';
	let engine: SceneEngine | null = null;
	let spheres: SpherePass | null = null;
	// The focused body's terrain is recorded directly into the engine's shared pass on the
	// shared device (Phase 5 single-pass) — no offscreen texture, no CSS overlay.
	let proceduralRenderer: PlanetRenderer | null = null;
	let sceneAtmosphere: SceneAtmospherePass | null = null;

	const BODY_COLOR: Record<BodyNode['bodyType'], [number, number, number]> = {
		star: [1.0, 0.82, 0.5],
		gas_giant: [0.79, 0.64, 0.42],
		planet: [0.42, 0.62, 1.0],
		moon: [0.6, 0.64, 0.72]
	};

	// Orbit params; the target is computed each frame (follows the selection), so the
	// camera tracks a body as it orbits. Stored target stays unused.
	let camera = $state<OrbitCamera>({ azimuth: 0.7, elevation: 0.5, distance: 1.5e8, target: [0, 0, 0] });

	/** Camera target: the selected node's live world position, else the system centre. */
	function targetOf(animated: PlanetScene): Vec3 {
		return selectedId ? getWorldTransform(animated, selectedId).position : [0, 0, 0];
	}


	// Screen-size LOD lives in buildDrawList (dot/sphere/procedural by projected px, with
	// ±15% hysteresis via lodState). A dot renders as a fixed-size point so distant
	// bodies stay visible; sphere/procedural use the true radius (procedural is drawn as
	// a sphere here — the engine swaps it for the real render). lodState persists frames.
	const DOT_RADIUS_PX = 2.5;
	const lodState = new Map<string, LodLevel>();

	function instancesFromDrawList(drawList: DrawItem[], excludeId: string | null = null): BodyInstance[] {
		const screenScale = (1 / Math.tan(FOVY / 2)) * (h / 2);
		const out: BodyInstance[] = [];
		for (const it of drawList) {
			if (!it.screen) continue; // off-screen → cull
			if (it.id === excludeId) continue; // rendered procedurally instead of as a sphere
			const radius = it.lod === 'dot' ? (DOT_RADIUS_PX * it.screen.depth) / screenScale : it.radiusMeters;
			out.push({
				position: it.worldPos,
				radius,
				color: BODY_COLOR[it.bodyType],
				emissive: it.bodyType === 'star'
			});
		}
		return out;
	}

	function lighting(animated: PlanetScene): SceneLighting {
		const col = collectSceneLights(animated);
		// Sun = the (global) point light; its world position is the light position.
		const sun = col.lights.find((l) => l.kind === 'point') ?? col.lights[0];
		return {
			lightPos: sun ? sun.directionOrPosition : [0, 0, 0],
			lightColor: sun ? sun.color : [1, 1, 1],
			lightIntensity: sun ? sun.intensity : 3,
			ambient: col.ambient
		};
	}

	/** Fit the whole system: distance from the farthest body (target = centre). */
	function frameAll() {
		const animated = evaluateScene(scene, time);
		let max = 1;
		for (const b of listBodies(animated)) {
			const p = getWorldTransform(animated, b.id).position;
			max = Math.max(max, Math.hypot(p[0], p[1], p[2]) + b.radiusMeters);
		}
		camera = { ...camera, distance: max * 2.2 };
	}

	// Reframe when the selection changes: zoom to the body, else fit the system.
	$effect(() => {
		const id = selectedId;
		untrack(() => {
			if (!id) {
				frameAll();
				return;
			}
			const node = scene.nodes.get(id);
			if (node && node.kind === 'body') camera = { ...camera, distance: node.radiusMeters * 8 };
		});
	});

	function render() {
		if (!device || !context || !engine || !spheres) return;
		const animated = evaluateScene(scene, time);
		const cam = { ...camera, target: targetOf(animated) };
		const vp = viewProjection(cam, w / h);
		const drawList = buildDrawList(animated, vp, w, h, lodState);
		const light = lighting(animated);
		updateMarker(animated, vp);
		updateProcedural(animated, drawList);
		const terrainMaterialDebug = sceneMaterialDebugMode(materialDebug);

		// Single pass: spheres + the focused body's terrain into one shared color+depth, so
		// the terrain depth-tests against the moons. When a body renders procedurally we skip
		// its sphere (the terrain replaces it). The atmosphere then composites in a second
		// pass: selected-body surface-distance target for march end, shared scene depth for
		// foreground occlusion by moons and other rendered bodies.
		const procActive = !!(procBody && procBlend > 0 && proceduralRenderer);
		const instances = instancesFromDrawList(drawList, procActive ? procBody!.id : null);

		// Build the terrain input once and reuse its body-local camera for the atmosphere.
		const procInput = procActive
			? buildProceduralRenderInput({
					body: procBody!,
					camera: cam,
					width: w,
					height: h,
					time,
					lighting: procLighting,
					planetRotation: procRotation,
					materialDebug: terrainMaterialDebug,
					lookMode,
					viewportPrefs
				})
			: null;

		let atmoOverlay:
			| ((
					pass: GPURenderPassEncoder,
					sceneColorView: GPUTextureView,
					depthView: GPUTextureView,
					surfaceDistanceView: GPUTextureView
			  ) => void)
			| undefined;
		if (procActive && procInput && sceneAtmosphere) {
			const bodyAtmo = resolveBodyAtmosphere(procBody!);
			if (bodyAtmo.enabled) {
				const camState = procInput.camera;
				const atmoIn = {
					invViewProjection: invert4(camState.viewProjectionMatrix),
					viewProjection: camState.viewProjectionMatrix,
					camera: camState,
					atmosphere: toGpuAtmosphereParams(
						bodyAtmosphereToParameters(bodyAtmo),
						procBody!.radiusMeters,
						[0, 0, 0]
					),
					lighting: procLighting,
					materialOverrides: procInput.materialOverrides,
					width: w,
					height: h,
					debugMode: sceneAtmosphereDebugToGpu(materialDebug)
				};
				atmoOverlay = (pass, sceneColorView, depthView, surfaceDistanceView) =>
					sceneAtmosphere!.record(pass, sceneColorView, depthView, surfaceDistanceView, atmoIn);
			}
		}

		engine.render(
			context.getCurrentTexture().createView(),
			w,
			h,
			(pass) => {
				if (!atmosphereOnWhite) spheres!.record(pass, instances, vp, light);
				if (procActive && procInput) {
					proceduralRenderer!.recordInto(pass, procInput, { surfaceOnly: atmosphereOnWhite });
				}
			},
			atmoOverlay,
			atmosphereOnWhite ? { r: 1, g: 1, b: 1, a: 1 } : undefined
		);
	}

	/** Project the selected node to a screen-space ring sized to its body. */
	function updateMarker(animated: PlanetScene, vp: Float32Array) {
		const node = selectedId ? animated.nodes.get(selectedId) : null;
		if (!node) {
			marker = null;
			return;
		}
		const sp = projectToScreen(vp, getWorldTransform(animated, selectedId!).position, w, h);
		if (!sp) {
			marker = null;
			return;
		}
		const radius = node.kind === 'body' ? node.radiusMeters : 0;
		const screenR = radius > 0 ? (radius / sp.depth) * (1 / Math.tan(FOVY / 2)) * (h / 2) : 0;
		marker = { x: sp.x, y: sp.y, r: Math.max(screenR, 8) + 5 };
	}

	/** Procedural cross-fade for the selected planet/moon, from its draw-list item (uses
	 *  the stable scene node so the layer's body prop doesn't churn each frame). */
	function updateProcedural(animated: PlanetScene, drawList: DrawItem[]) {
		const item = selectedId ? drawList.find((d) => d.id === selectedId) : undefined;
		const node = selectedId ? scene.nodes.get(selectedId) : null;
		if (
			item?.screen &&
			node?.kind === 'body' &&
			(node.bodyType === 'planet' || node.bodyType === 'moon')
		) {
			procBlend = item.blend;
			procBody = item.blend > 0 ? node : null;
			procWorldPos = item.worldPos;
			procRotation = getWorldTransform(animated, node.id).rotation;
			// Mask the layer to the planet disc + an atmosphere feather; rest transparent.
			const r = item.screenPx / 2;
			procMask = procBody ? { x: item.screen.x, y: item.screen.y, r0: r, r1: r * 1.35 } : null;
			if (procBody) {
				// Sun as a directional light toward Sol, in the body's (untilted) frame.
				const col = collectSceneLights(animated);
				const sun = col.lights.find((l) => l.kind === 'point') ?? col.lights[0];
				const sunDir: Vec3 = sun ? normalize3(sub3(sun.directionOrPosition, item.worldPos)) : [0, 1, 0];
				procLighting = packSceneLighting({
					ambient: col.ambient,
					lights: [
						{
							kind: 'directional',
							directionOrPosition: sunDir,
							color: sun?.color ?? [1, 1, 1],
							intensity: sun?.intensity ?? 3,
							range: 0
						}
					]
				});
			}
			return;
		}
		procBlend = 0;
		procBody = null;
		procMask = null;
	}

	/** Pick the front-most body whose projected disc contains the click; else deselect. */
	function pick(clientX: number, clientY: number) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const px = clientX - rect.left;
		const py = clientY - rect.top;
		const animated = evaluateScene(scene, time);
		const vp = viewProjection({ ...camera, target: targetOf(animated) }, w / h);
		let best: { id: string; depth: number } | null = null;
		for (const b of listBodies(animated)) {
			const sp = projectToScreen(vp, getWorldTransform(animated, b.id).position, w, h);
			if (!sp) continue;
			const screenR = (b.radiusMeters / sp.depth) * (1 / Math.tan(FOVY / 2)) * (h / 2);
			const hitR = Math.max(screenR, 8);
			if (Math.hypot(px - sp.x, py - sp.y) > hitR) continue;
			if (!best || sp.depth < best.depth) best = { id: b.id, depth: sp.depth };
		}
		selectedId = best ? best.id : null;
	}

	let dragging = false;
	let moved = false;
	let lastX = 0;
	let lastY = 0;
	let downX = 0;
	let downY = 0;
	function onPointerDown(e: PointerEvent) {
		dragging = true;
		moved = false;
		lastX = downX = e.clientX;
		lastY = downY = e.clientY;
		canvas?.setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) moved = true; // drag, not a click
		if (!moved) return;
		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
		camera = {
			...camera,
			azimuth: camera.azimuth - dx * 0.01,
			elevation: clampElevation(camera.elevation + dy * 0.01)
		};
	}
	function onPointerUp(e: PointerEvent) {
		dragging = false;
		canvas?.releasePointerCapture?.(e.pointerId);
		if (!moved) pick(e.clientX, e.clientY); // a click → select
	}
	function onWheel(e: WheelEvent) {
		e.preventDefault();
		camera = { ...camera, distance: Math.max(1e5, camera.distance * (1 + Math.sign(e.deltaY) * 0.12)) };
	}

	// Render on demand: re-render only when an input actually changes. When the clock is
	// paused it stops advancing, so nothing re-renders and the scene truly freezes (no
	// wasted frames). The earlier continuous loop ran every frame regardless. Everything
	// is now one pass in render() (spheres + terrain), so there's no separate layer to
	// desync — the stall that motivated the old continuous loop is gone with the overlay.
	let raf = 0;
	function requestRender() {
		if (raf) return; // a render is already queued for the next frame
		raf = requestAnimationFrame(() => {
			raf = 0;
			render();
		});
	}

	// Track every render input; any change schedules one render. The clock (`time`) is the
	// playing-animation driver, so a paused clock yields no re-render.
	$effect(() => {
		void time;
		void scene;
		void selectedId;
		void materialDebug;
		void lookMode;
		viewportPrefsRenderDeps(viewportPrefs);
		void camera;
		void w;
		void h;
		requestRender();
	});

	onMount(() => {
		const el = canvas;
		if (!el) return;
		let disposed = false;
		(async () => {
			try {
				const r = await requestWebGPUDevice();
				if (disposed) return;
				device = r.device;
				format = navigator.gpu.getPreferredCanvasFormat();
				context = configureWebGPUCanvas(device, el, format);
				engine = new SceneEngine(device, format);
				spheres = new SpherePass(device, format);
				sceneAtmosphere = new SceneAtmospherePass(device, format);
				// Offscreen procedural renderer adopting the shared device (no swapchain); its
				// terrain is recorded straight into the engine pass via recordInto.
				proceduralRenderer = new PlanetRenderer(new WebGPUBackend());
				await proceduralRenderer.init(null, device);
				if (disposed) return;
				frameAll();
				requestRender(); // first paint now that the device is ready
			} catch (err) {
				failed = err instanceof Error ? err.message : 'WebGPU unavailable';
			}
		})();
		const ro = new ResizeObserver(() => {
			w = el.clientWidth || 1;
			h = el.clientHeight || 1;
			el.width = w;
			el.height = h;
		});
		ro.observe(el);
		w = el.clientWidth || 1;
		h = el.clientHeight || 1;
		el.width = w;
		el.height = h;
		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			ro.disconnect();
			sceneAtmosphere?.destroy();
			proceduralRenderer?.destroy();
			spheres?.destroy();
			engine?.destroy();
		};
	});
</script>

<div class="viewport-3d">
	<canvas
		bind:this={canvas}
		class="canvas3d"
		aria-label="3D system view"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onwheel={onWheel}
	></canvas>
	{#if marker && !atmosphereDebugActive}
		<div
			class="sel-ring"
			style="left:{marker.x}px; top:{marker.y}px; width:{marker.r * 2}px; height:{marker.r * 2}px;"
		></div>
	{/if}
	{#if !atmosphereDebugActive}
		<button type="button" class="frame-btn" onclick={() => (selectedId = null)}>Frame all</button>
	{/if}
	{#if failed}
		<div class="overlay">3D unavailable: {failed} — use the 2D map.</div>
	{/if}
</div>

<style>
	.viewport-3d {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 320px;
	}

	.canvas3d {
		width: 100%;
		height: 100%;
		display: block;
		border-radius: 8px;
		background: #060810;
		touch-action: none;
		cursor: grab;
	}

	.canvas3d:active {
		cursor: grabbing;
	}

	.sel-ring {
		position: absolute;
		transform: translate(-50%, -50%);
		border: 2px solid #9ec0ff;
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(158, 192, 255, 0.7);
		pointer-events: none;
	}

	.frame-btn {
		position: absolute;
		top: 10px;
		left: 10px;
		font: 11px/1.2 system-ui, sans-serif;
		padding: 3px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(26, 31, 48, 0.85);
		color: #e8ecf8;
		cursor: pointer;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		text-align: center;
		font: 12px/1.4 system-ui, sans-serif;
		color: #e8ecf8;
		background: rgba(6, 8, 16, 0.7);
		border-radius: 8px;
	}
</style>
