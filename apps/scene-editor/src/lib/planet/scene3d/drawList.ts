import type { Vec3 } from '../math/vec.js';
import type { BodyType, PlanetScene } from '../scene/types.js';
import { getWorldTransform, listBodies } from '../scene/sceneTree.js';
import {
	DEFAULT_FADE_GAMMA,
	resolveLodTransitionBlends,
	selectLod,
	type LodLevel,
	type LodThresholds,
	type LodTransitionMode
} from '../scene/bodyParams.js';
import { FOVY, projectToScreen } from './orbitCamera.js';

// The per-frame draw list for the scene engine: each visible body projected, with its
// chosen LOD (dot/mesh, ±15% hysteresis) and per-channel transition blends. Pure given
// the caller's lodState (carried across frames for hysteresis). This is the one source
// the engine renders from — dots, tessellated bodies, atmospheres. See
// _docs/specs/unified-scene-renderer.md.

export interface DrawItem {
	id: string;
	bodyType: BodyType;
	radiusMeters: number;
	worldPos: Vec3;
	/** Node world scale — applied to stand-in sphere geometry. */
	worldScale: Vec3;
	/** Screen position (px) + clip-w depth; null when off-screen / behind the camera. */
	screen: { x: number; y: number; depth: number } | null;
	/** Projected radius (px) — half the on-screen disc; 0 when off-screen. */
	screenRadiusPx: number;
	lod: LodLevel;
	/** Linear terrain-band blend 0..1 (proceduralAbove → proceduralFull). */
	terrainBlend: number;
	displacementBlend: number;
	heightBlend: number;
	atmosphereBlend: number;
}

const RANK: Record<LodLevel, number> = { dot: 0, mesh: 1 };

function lodWithHysteresis(
	id: string,
	px: number,
	lodState: Map<string, LodLevel>,
	t: LodThresholds
): LodLevel {
	const prev = lodState.get(id);
	let level = selectLod(px, t);
	if (prev && level !== prev) {
		// Only change once px crosses the threshold by ±15%, to avoid flicker.
		if (RANK[level] > RANK[prev] && RANK[selectLod(px / 1.15, t)] <= RANK[prev]) level = prev;
		else if (RANK[level] < RANK[prev] && RANK[selectLod(px * 1.15, t)] >= RANK[prev]) level = prev;
	}
	lodState.set(id, level);
	return level;
}

export interface BuildDrawListOptions {
	lod: LodThresholds;
	transitionMode?: LodTransitionMode;
	fadeGamma?: number;
}

export function buildDrawList(
	animated: PlanetScene,
	vp: Float32Array,
	eye: Vec3,
	width: number,
	height: number,
	lodState: Map<string, LodLevel>,
	options: BuildDrawListOptions | LodThresholds
): DrawItem[] {
	const lod = 'sphereAboveRadiusPx' in options ? options : options.lod;
	const transitionMode =
		'sphereAboveRadiusPx' in options ? 'both' : (options.transitionMode ?? 'both');
	const fadeGamma =
		'sphereAboveRadiusPx' in options ? DEFAULT_FADE_GAMMA : (options.fadeGamma ?? DEFAULT_FADE_GAMMA);

	const screenScale = (1 / Math.tan(FOVY / 2)) * (height / 2);
	const out: DrawItem[] = [];
	for (const b of listBodies(animated)) {
		const world = getWorldTransform(animated, b.id);
		const worldPos = world.position;
		const worldScale = world.scale;
		const scaleMag = Math.max(
			Math.abs(worldScale[0]),
			Math.abs(worldScale[1]),
			Math.abs(worldScale[2])
		);
		const displayRadius = b.radiusMeters * scaleMag;
		const sp = projectToScreen(
			vp,
			[worldPos[0] - eye[0], worldPos[1] - eye[1], worldPos[2] - eye[2]],
			width,
			height
		);
		const screenRadiusPx = sp ? (displayRadius / sp.depth) * screenScale : 0;
		const lodLevel = sp ? lodWithHysteresis(b.id, screenRadiusPx, lodState, lod) : 'dot';
		const blends =
			lodLevel === 'mesh'
				? resolveLodTransitionBlends(screenRadiusPx, lod, transitionMode, fadeGamma)
				: {
						displacementBlend: 0,
						heightBlend: 0,
						atmosphereBlend: 0
					};
		const terrainBlend =
			lodLevel === 'mesh'
				? Math.max(
						0,
						Math.min(
							1,
							(screenRadiusPx - lod.proceduralAboveRadiusPx) /
								Math.max(1, lod.proceduralFullRadiusPx - lod.proceduralAboveRadiusPx)
						)
					)
				: 0;
		out.push({
			id: b.id,
			bodyType: b.bodyType,
			radiusMeters: b.radiusMeters,
			worldPos,
			worldScale,
			screen: sp,
			screenRadiusPx,
			lod: lodLevel,
			terrainBlend,
			...blends
		});
	}
	return out;
}
