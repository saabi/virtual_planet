import type { Vec3 } from '../math/vec.js';
import { len3 } from '../math/vec.js';
import { FOVY } from '../scene3d/orbitCamera.js';
import type { KeplerDriver, OrbitElements, PlanetScene } from './types.js';
import { eccentricAnomalyAtTime, orbitPathLocal, orbitPerimeter } from './orbit.js';
import { getWorldTransform, listBodies } from './sceneTree.js';
import { transformOffset, transformPoint, UNIT_SCALE, type WorldTransform } from './transform.js';

const DEFAULT_SEGMENTS = 96;

export interface OrbitPathSpec {
	keplerNodeId: string;
	/** A body that orbits on this path (for selection filtering). */
	bodyId: string | null;
	/** World transform of the node that owns this path (kepler or legacy orbit node). */
	frame: WorldTransform;
	elements: OrbitElements;
}

/** Sampled orbit path ready for rendering. */
export interface OrbitPath3D extends OrbitPathSpec {
	/** Eye-relative offsets from {@link frame}.position (metres). Used by the 3D line pass. */
	localPoints: Vec3[];
	/** World-space loop for 2D map projection. */
	points: Vec3[];
}

export interface OrbitPathSegmentOpts {
	maxChordPx?: number;
	min?: number;
	max?: number;
	fovy?: number;
}

function keplerToOrbitElements(driver: KeplerDriver): OrbitElements {
	return {
		semiMajorAxis: driver.semiMajorAxis,
		eccentricity: driver.eccentricity,
		periodSeconds: driver.periodSeconds,
		phaseAtEpoch: driver.phaseAtEpoch,
		periapsisAngle: driver.periapsisAngle
	};
}

function orbitPlaneScale(frame: WorldTransform): number {
	return Math.max(Math.abs(frame.scale[0]), Math.abs(frame.scale[2]));
}

/**
 * Screen-space adaptive segment count for an orbit ellipse. Matches the scene draw-list
 * projection scale so chord length stays near `maxChordPx` pixels.
 */
export function orbitPathSegmentCount(
	elements: OrbitElements,
	viewDistance: number,
	viewportHeight: number,
	opts: OrbitPathSegmentOpts = {},
	frame: WorldTransform = { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: UNIT_SCALE }
): number {
	const { maxChordPx = 4, min = 32, max = 256, fovy = FOVY } = opts;
	const planeScale = orbitPlaneScale(frame);
	const perimeter = orbitPerimeter({
		...elements,
		semiMajorAxis: elements.semiMajorAxis * planeScale
	});
	const screenScale = (1 / Math.tan(fovy / 2)) * (viewportHeight / 2);
	const pxPerMeter = screenScale / Math.max(viewDistance, 1);
	const perimeterPx = perimeter * pxPerMeter;
	return Math.max(min, Math.min(max, Math.ceil(perimeterPx / maxChordPx)));
}

/** Conservative bounding sphere for far-plane fitting (independent of tessellation). */
export function orbitPathBoundsForNearFar(spec: OrbitPathSpec): { center: Vec3; radius: number } {
	const samples = orbitPathLocal(spec.elements, 32);
	let radius = 0;
	for (const p of samples) {
		radius = Math.max(radius, len3(transformOffset(spec.frame, p)));
	}
	return { center: spec.frame.position, radius };
}

/** Sample orbit offsets in the owning node's local frame (before world TRS). */
export function sampleOrbitPathLocal(
	spec: OrbitPathSpec,
	segments: number,
	opts?: { injectBodyE?: number; sceneTime?: number }
): Vec3[] {
	const injectE =
		opts?.injectBodyE ??
		(opts?.sceneTime !== undefined && spec.bodyId
			? eccentricAnomalyAtTime(spec.elements, opts.sceneTime)
			: undefined);
	return orbitPathLocal(spec.elements, segments, injectE);
}

/** Sample world-space orbit points. Optionally inject the body's eccentric anomaly. */
export function sampleOrbitPath(
	spec: OrbitPathSpec,
	segments: number,
	opts?: { injectBodyE?: number; sceneTime?: number }
): Vec3[] {
	const local = sampleOrbitPathLocal(spec, segments, opts);
	return local.map((p) => transformPoint(spec.frame, p));
}

/**
 * Collect unique orbit ellipse specs for the scene. Each kepler-driver container
 * yields one path (deduped). Legacy `node.orbit` on any node also yields a path.
 */
export function collectOrbitPathSpecs(scene: PlanetScene): OrbitPathSpec[] {
	const byKepler = new Map<string, OrbitPathSpec>();

	for (const body of listBodies(scene)) {
		let cur = body.parentId ? scene.nodes.get(body.parentId) : undefined;
		while (cur && cur.driver?.type !== 'kepler' && cur.kind !== 'body') {
			cur = cur.parentId ? scene.nodes.get(cur.parentId) : undefined;
		}
		if (!cur || cur.driver?.type !== 'kepler') continue;

		if (!byKepler.has(cur.id)) {
			byKepler.set(cur.id, {
				keplerNodeId: cur.id,
				bodyId: body.id,
				frame: getWorldTransform(scene, cur.id),
				elements: keplerToOrbitElements(cur.driver)
			});
		}
	}

	// Legacy position-model orbits on any node (skip if already collected via kepler).
	for (const node of scene.nodes.values()) {
		if (!node.orbit || byKepler.has(node.id)) continue;
		byKepler.set(node.id, {
			keplerNodeId: node.id,
			bodyId: node.kind === 'body' ? node.id : null,
			frame: getWorldTransform(scene, node.id),
			elements: node.orbit
		});
	}

	// Kepler containers with no body children yet (authoring).
	for (const node of scene.nodes.values()) {
		if (node.driver?.type !== 'kepler') continue;
		if (byKepler.has(node.id)) continue;
		byKepler.set(node.id, {
			keplerNodeId: node.id,
			bodyId: null,
			frame: getWorldTransform(scene, node.id),
			elements: keplerToOrbitElements(node.driver)
		});
	}

	return [...byKepler.values()];
}

/**
 * Collect unique orbit ellipse paths for the scene with a fixed segment count.
 * Prefer {@link collectOrbitPathSpecs} + {@link sampleOrbitPath} for adaptive LOD.
 */
export function collectOrbitPaths(
	scene: PlanetScene,
	segments = DEFAULT_SEGMENTS,
	sceneTime?: number
): OrbitPath3D[] {
	return collectOrbitPathSpecs(scene).map((spec) => ({
		...spec,
		...buildOrbitPathSamples(spec, segments, sceneTime)
	}));
}

function buildOrbitPathSamples(
	spec: OrbitPathSpec,
	segments: number,
	sceneTime?: number
): Pick<OrbitPath3D, 'localPoints' | 'points'> {
	const opts = sceneTime !== undefined ? { sceneTime } : undefined;
	const orbitLocal = sampleOrbitPathLocal(spec, segments, opts);
	const localPoints = orbitLocal.map((p) => transformOffset(spec.frame, p));
	return {
		localPoints,
		points: orbitLocal.map((p) => transformPoint(spec.frame, p))
	};
}

/** Build a rendered path from a spec with adaptive segment count. */
export function buildOrbitPath3D(
	spec: OrbitPathSpec,
	segments: number,
	sceneTime?: number
): OrbitPath3D {
	return {
		...spec,
		...buildOrbitPathSamples(spec, segments, sceneTime)
	};
}
