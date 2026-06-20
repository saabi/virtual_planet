import type { Vec3 } from '../math/vec.js';
import type { BodyType, PlanetScene } from '../scene/types.js';
import { getWorldTransform, listBodies } from '../scene/sceneTree.js';
import { proceduralBlend, selectLod, type LodLevel } from '../scene/bodyParams.js';
import { FOVY, projectToScreen } from './orbitCamera.js';

// The per-frame draw list for the scene engine: each visible body projected, with its
// chosen LOD (dot/sphere/procedural, ±15% hysteresis) and procedural cross-fade. Pure
// given the caller's lodState (carried across frames for hysteresis). This is the one
// source the engine renders from — spheres, the fade composite, and (later) the
// single-pass procedural body all read it. See _docs/specs/unified-scene-renderer.md.

export interface DrawItem {
	id: string;
	bodyType: BodyType;
	radiusMeters: number;
	worldPos: Vec3;
	/** Screen position (px) + clip-w depth; null when off-screen / behind the camera. */
	screen: { x: number; y: number; depth: number } | null;
	/** Projected diameter (px); 0 when off-screen. */
	screenPx: number;
	lod: LodLevel;
	/** Procedural cross-fade 0..1. */
	blend: number;
}

const RANK: Record<LodLevel, number> = { dot: 0, sphere: 1, procedural: 2 };

function lodWithHysteresis(
	body: Parameters<typeof selectLod>[0],
	px: number,
	lodState: Map<string, LodLevel>
): LodLevel {
	const prev = lodState.get(body.id);
	let level = selectLod(body, px);
	if (prev && level !== prev) {
		// Only change once px crosses the threshold by ±15%, to avoid flicker.
		if (RANK[level] > RANK[prev] && RANK[selectLod(body, px / 1.15)] <= RANK[prev]) level = prev;
		else if (RANK[level] < RANK[prev] && RANK[selectLod(body, px * 1.15)] >= RANK[prev]) level = prev;
	}
	lodState.set(body.id, level);
	return level;
}

export function buildDrawList(
	animated: PlanetScene,
	vp: Float32Array,
	width: number,
	height: number,
	lodState: Map<string, LodLevel>
): DrawItem[] {
	const screenScale = (1 / Math.tan(FOVY / 2)) * (height / 2);
	const out: DrawItem[] = [];
	for (const b of listBodies(animated)) {
		const worldPos = getWorldTransform(animated, b.id).position;
		const sp = projectToScreen(vp, worldPos, width, height);
		const screenPx = sp ? 2 * (b.radiusMeters / sp.depth) * screenScale : 0;
		out.push({
			id: b.id,
			bodyType: b.bodyType,
			radiusMeters: b.radiusMeters,
			worldPos,
			screen: sp,
			screenPx,
			lod: sp ? lodWithHysteresis(b, screenPx, lodState) : 'dot',
			blend: sp ? proceduralBlend(b, screenPx) : 0
		});
	}
	return out;
}
