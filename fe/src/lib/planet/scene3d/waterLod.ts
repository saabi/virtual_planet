import { seaLevelRadius } from '../camera/seaLevel.js';
import { resolveBodyParams } from '../scene/bodyParams.js';
import type { PlanetParameters } from '../params/planetParams.js';
import type { BodyNode, PlanetScene, Quat } from '../scene/types.js';
import { getWorldTransform } from '../scene/sceneTree.js';
import type { Vec3 } from '../math/vec.js';
import type { DrawItem } from './drawList.js';
import { MAX_PROCEDURAL_BODIES } from './proceduralBodies.js';
import type { ProceduralRenderTarget } from './proceduralBodies.js';

export type WaterLodLevel = 'off' | 'low' | 'high';

export interface WaterLodThresholds {
	/** Below this projected body radius (px), no water shell. */
	waterAboveRadiusPx: number;
	/** Coarse UV sphere below this; finer bands above. */
	waterFullRadiusPx: number;
}

export const DEFAULT_WATER_LOD_THRESHOLDS: WaterLodThresholds = {
	waterAboveRadiusPx: 1,
	waterFullRadiusPx: 80
};

export function selectWaterLod(px: number, t: WaterLodThresholds): WaterLodLevel {
	if (px < t.waterAboveRadiusPx) return 'off';
	if (px < t.waterFullRadiusPx) return 'low';
	return 'high';
}

export function uvSphereBands(level: WaterLodLevel): { latBands: number; lonBands: number } {
	switch (level) {
		case 'low':
			return { latBands: 8, lonBands: 12 };
		case 'high':
			return { latBands: 32, lonBands: 48 };
		default:
			return { latBands: 8, lonBands: 12 };
	}
}

export interface WaterRenderTarget {
	id: string;
	body: BodyNode;
	worldPos: Vec3;
	rotation: Quat;
	seaLevelRadiusMeters: number;
	screenRadiusPx: number;
	lod: WaterLodLevel;
	/** Resolved terrain params (radius = render radius) for the ocean self-shadow march. */
	params: PlanetParameters;
}

function renderRadiusMeters(item: DrawItem): number {
	const scale = Math.max(
		Math.abs(item.worldScale[0]),
		Math.abs(item.worldScale[1]),
		Math.abs(item.worldScale[2])
	);
	return item.radiusMeters * scale;
}

/** Bodies with `render_water` enabled above the water LOD cutoff. */
export function selectWaterTargets(
	drawList: DrawItem[],
	scene: PlanetScene,
	animated: PlanetScene,
	maxBodies = MAX_PROCEDURAL_BODIES,
	waterLod: WaterLodThresholds = DEFAULT_WATER_LOD_THRESHOLDS
): WaterRenderTarget[] {
	const out: WaterRenderTarget[] = [];

	for (const item of drawList) {
		if (!item.screen) continue;
		const node = scene.nodes.get(item.id);
		if (!node || node.kind !== 'body') continue;
		if (node.bodyType !== 'planet' && node.bodyType !== 'moon') continue;

		const lod = selectWaterLod(item.screenRadiusPx, waterLod);
		if (lod === 'off') continue;

		const params = { ...resolveBodyParams(node), radius: renderRadiusMeters(item) };
		if (params.render_water <= 0.5) continue;

		out.push({
			id: item.id,
			body: node,
			worldPos: item.worldPos,
			rotation: getWorldTransform(animated, item.id).rotation,
			seaLevelRadiusMeters: seaLevelRadius(params),
			screenRadiusPx: item.screenRadiusPx,
			lod,
			params
		});
	}

	out.sort((a, b) => b.screenRadiusPx - a.screenRadiusPx);
	return out.slice(0, maxBodies);
}

/** Water targets for bodies already selected for procedural terrain. */
export function selectProceduralWaterTargets(
	targets: ProceduralRenderTarget[],
	maxBodies = MAX_PROCEDURAL_BODIES,
	waterLod: WaterLodThresholds = DEFAULT_WATER_LOD_THRESHOLDS
): WaterRenderTarget[] {
	const out: WaterRenderTarget[] = [];

	for (const target of targets) {
		const lod = selectWaterLod(target.screenRadiusPx, waterLod);
		if (lod === 'off') continue;

		const params = { ...resolveBodyParams(target.body), radius: target.renderRadius };
		if (params.render_water <= 0.5) continue;

		out.push({
			id: target.id,
			body: target.body,
			worldPos: target.worldPos,
			rotation: target.rotation,
			seaLevelRadiusMeters: seaLevelRadius(params),
			screenRadiusPx: target.screenRadiusPx,
			lod,
			params
		});
	}

	out.sort((a, b) => b.screenRadiusPx - a.screenRadiusPx);
	return out.slice(0, maxBodies);
}

/** Max projected radius across targets: choose one mesh resolution for the batch. */
export function batchWaterLodLevel(targets: WaterRenderTarget[]): WaterLodLevel {
	let best: WaterLodLevel = 'off';
	for (const t of targets) {
		if (t.lod === 'high') return 'high';
		if (t.lod === 'low') best = 'low';
	}
	return best;
}
