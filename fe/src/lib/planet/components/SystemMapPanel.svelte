<script lang="ts">
	import { onMount } from 'svelte';
	import type { Vec3 } from '../math/vec.js';
	import { getChildren, getWorldTransform, listBodies } from '../scene/sceneTree.js';
	import { evaluateScene } from '../scene/driver.js';
	import {
		collectOrbitPathSpecs,
		buildOrbitPath3D,
		orbitPathSegmentCount
	} from '../scene/orbitPaths.js';
	import {
		fitView,
		pickNearest,
		projectToScreen,
		xzBounds,
		type MapView,
		type ScreenPoint
	} from '../scene/systemMap.js';
	import type { BodyNode, PlanetScene } from '../scene/types.js';

	interface Props {
		scene: PlanetScene;
		/** Shared with the scene tree: the selected node id. */
		selectedId?: string | null;
		/** Shared animation clock (seconds); advanced by the route, read-only here. */
		time?: number;
		/** Shared play/pause + speed (the route owns the single clock advancer). */
		playing?: boolean;
		speed?: number;
	}

	let {
		scene,
		selectedId = $bindable(null),
		time = 0,
		playing = $bindable(true),
		speed = $bindable(1)
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	/** Body the map follows/zooms to; null = fit the whole system. */
	let followId = $state<string | null>(null);
	let canvasW = $state(1);
	let canvasH = $state(1);

	let screenPoints: ScreenPoint[] = [];

	const BODY_STYLE: Record<BodyNode['bodyType'], { r: number; color: string }> = {
		star: { r: 6, color: '#ffd27f' },
		gas_giant: { r: 5, color: '#caa46a' },
		planet: { r: 4, color: '#6b9fff' },
		moon: { r: 2.5, color: '#9aa4b8' }
	};

	interface OrbitPath {
		bodyId: string | null;
		/** World (x, z) points tracing the orbit ellipse. */
		pts: Array<[number, number]>;
	}

	function orbitPathsForView(animated: PlanetScene, view: MapView): OrbitPath[] {
		return collectOrbitPathSpecs(animated).map((spec) => {
			const viewDist = Math.hypot(
				spec.frame.position[0] - view.worldCenterX,
				spec.frame.position[2] - view.worldCenterZ
			);
			const isSelected = spec.bodyId === selectedId || spec.keplerNodeId === selectedId;
			const segments = orbitPathSegmentCount(
				spec.elements,
				Math.max(viewDist, spec.elements.semiMajorAxis * 0.1),
				view.height,
				isSelected
					? { maxChordPx: 2, min: 32, max: 256 }
					: { maxChordPx: 3, min: 32, max: 128 },
				spec.frame
			);
			const path = buildOrbitPath3D(spec, segments, time);
			return {
				bodyId: path.bodyId,
				pts: path.points.map((pt) => [pt[0], pt[2]] as [number, number])
			};
		});
	}

	function fitAllViewFromSpecs(
		animated: PlanetScene,
		bodies: BodyNode[],
		specs: ReturnType<typeof collectOrbitPathSpecs>
	): MapView {
		const pts: Vec3[] = [];
		for (const b of bodies) pts.push(getWorldTransform(animated, b.id).position);
		for (const spec of specs) {
			const path = buildOrbitPath3D(spec, 24, time);
			for (const p of path.points) pts.push(p);
		}
		return fitView(xzBounds(pts), canvasW, canvasH, 28);
	}

	/** Zoom span (world meters) when following a body: frame its moons, or itself. */
	function followSpan(animated: PlanetScene, body: BodyNode): number {
		let span = 0;
		if (body.parentId != null) {
			// Moons orbit the body's system center (the body's parent = its orbit node).
			for (const child of getChildren(animated, body.parentId)) {
				if (child.driver?.type === 'kepler') {
					span = Math.max(span, child.driver.semiMajorAxis * (1 + child.driver.eccentricity));
				}
			}
		}
		return Math.max(span * 1.3, body.radiusMeters * 8, 1);
	}

	function draw() {
		const el = canvas;
		if (!el) return;
		const ctx = el.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasW, canvasH);

		const animated = evaluateScene(scene, time);
		const bodies = listBodies(animated);
		if (bodies.length === 0) {
			ctx.fillStyle = 'rgba(232,236,248,0.5)';
			ctx.font = '12px system-ui';
			ctx.textAlign = 'center';
			ctx.fillText('No bodies — load the Toy Solar System', canvasW / 2, canvasH / 2);
			ctx.textAlign = 'left';
			screenPoints = [];
			return;
		}

		const worldPos = new Map<string, Vec3>();
		for (const b of bodies) worldPos.set(b.id, getWorldTransform(animated, b.id).position);
		const specs = collectOrbitPathSpecs(animated);

		let view: MapView;
		const followBody = followId ? (animated.nodes.get(followId) as BodyNode | undefined) : undefined;
		if (followBody && followBody.kind === 'body') {
			const c = worldPos.get(followBody.id)!;
			const span = followSpan(animated, followBody);
			view = {
				scale: Math.min(canvasW, canvasH) / (2 * span * 1.2),
				worldCenterX: c[0],
				worldCenterZ: c[2],
				width: canvasW,
				height: canvasH
			};
		} else {
			view = fitAllViewFromSpecs(animated, bodies, specs);
		}

		const paths = orbitPathsForView(animated, view);

		// Orbit ellipses (driver path offset to the orbit center, inertial).
		ctx.lineWidth = 1;
		for (const orbit of paths) {
			ctx.strokeStyle =
				orbit.bodyId && orbit.bodyId === selectedId
					? 'rgba(158,192,255,0.5)'
					: 'rgba(255,255,255,0.1)';
			ctx.beginPath();
			for (let i = 0; i < orbit.pts.length; i++) {
				const [px, py] = projectToScreen(view, orbit.pts[i][0], orbit.pts[i][1]);
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.stroke();
		}

		// Bodies + labels.
		screenPoints = [];
		for (const b of bodies) {
			const wp = worldPos.get(b.id)!;
			const [px, py] = projectToScreen(view, wp[0], wp[2]);
			screenPoints.push({ id: b.id, x: px, y: py });
			const st = BODY_STYLE[b.bodyType];
			// Dot reflects the body's true radius, clamped so it's always visible at
			// fit-all and scales up (showing radius edits) when zoomed in.
			const r = Math.max(st.r, Math.min(b.radiusMeters * view.scale, 60));
			if (b.bodyType === 'star') {
				ctx.beginPath();
				ctx.arc(px, py, r + 4, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(255,210,127,0.2)';
				ctx.fill();
			}
			ctx.beginPath();
			ctx.arc(px, py, r, 0, Math.PI * 2);
			ctx.fillStyle = st.color;
			ctx.fill();
			if (b.id === selectedId) {
				ctx.beginPath();
				ctx.arc(px, py, r + 4, 0, Math.PI * 2);
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
			ctx.fillStyle = 'rgba(232,236,248,0.75)';
			ctx.font = '10px system-ui, sans-serif';
			ctx.fillText(b.name, px + r + 3, py + 3);
		}
	}

	// Play/pause is shared state owned by the route (which runs the single clock advancer),
	// so toggling here syncs every panel and doesn't multiply the clock rate.
	function togglePlay() {
		playing = !playing;
	}

	function onPointerDown(e: PointerEvent) {
		const el = canvas;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const px = (e.clientX - rect.left) * (canvasW / rect.width);
		const py = (e.clientY - rect.top) * (canvasH / rect.height);
		const id = pickNearest(screenPoints, px, py, 14);
		if (id) {
			selectedId = id;
			followId = id; // zoom to / follow the object
		} else {
			followId = null; // click empty space → fit the whole system
		}
		if (!playing) draw();
	}

	// Render on demand: redraw whenever the clock advances (while playing) or any input
	// changes. A paused clock stops advancing, so the map simply holds its last frame.
	$effect(() => {
		void time;
		void scene;
		void selectedId;
		void followId;
		void canvasW;
		void canvasH;
		draw();
	});

	onMount(() => {
		const el = canvas;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			canvasW = el.clientWidth || 1;
			canvasH = el.clientHeight || 1;
			el.width = canvasW;
			el.height = canvasH;
		});
		ro.observe(el);
		canvasW = el.clientWidth || 1;
		canvasH = el.clientHeight || 1;
		el.width = canvasW;
		el.height = canvasH;
		return () => ro.disconnect();
	});
</script>

<section class="system-map" aria-label="System map">
	<div class="map-controls">
		<button type="button" onclick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
		<label class="speed">
			Speed
			<select bind:value={speed}>
				<option value={1}>1×</option>
				<option value={4}>4×</option>
				<option value={16}>16×</option>
			</select>
		</label>
		<button type="button" onclick={() => (followId = null)} disabled={followId === null}>
			Fit all
		</button>
	</div>
	<canvas bind:this={canvas} class="map-canvas" onpointerdown={onPointerDown}></canvas>
</section>

<style>
	.system-map {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		background: rgba(8, 10, 20, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		color: #e8ecf8;
	}

	.map-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		font: 11px/1.2 system-ui, sans-serif;
	}

	.map-controls button {
		font: 11px/1.2 system-ui, sans-serif;
		padding: 3px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: #1a1f30;
		color: inherit;
		cursor: pointer;
	}

	.map-controls button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.speed {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
	}

	.speed select {
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 1px 4px;
	}

	.map-canvas {
		width: 100%;
		height: 240px;
		display: block;
		background: radial-gradient(circle at 50% 50%, rgba(20, 26, 48, 0.6), rgba(4, 6, 14, 0.9));
		border-radius: 6px;
		cursor: pointer;
		touch-action: none;
	}
</style>
