import { collectSceneLights } from '../scene/collectLights.js';

import { packSceneLighting } from '../scene/packLighting.js';

import { getWorldTransform } from '../scene/sceneTree.js';

import type { TessellationSettings } from '../patches/tessellationSettings.js';

import type { LightingUniforms } from '../render/uniformLayouts.js';

import { normalize3, sub3, type Vec3 } from '../math/vec.js';

import type { BodyNode, PlanetScene, Quat } from '../scene/types.js';

import type { DrawItem } from './drawList.js';



/** Safety cap for procedural terrain + atmosphere bodies per frame (GPU uniform size). */

export const MAX_PROCEDURAL_BODIES = 8;



/** Total vertex-budget share split across all non-primary procedural bodies. */

export const SECONDARY_TESSELLATION_BUDGET_SCALE = 0.35;



export interface ProceduralRenderTarget {

	id: string;

	body: BodyNode;

	worldPos: Vec3;

	rotation: Quat;

	blend: number;

	screenDepth: number;

	screenRadiusPx: number;

}



export function isProceduralTerrainBody(node: BodyNode): boolean {

	return node.kind === 'body' && (node.bodyType === 'planet' || node.bodyType === 'moon');

}



/** Sun-as-directional lighting packed in the receiver body's local frame. */

export function packBodyTerrainLighting(animated: PlanetScene, worldPos: Vec3): LightingUniforms {

	const col = collectSceneLights(animated);

	const sun = col.lights.find((l) => l.kind === 'point') ?? col.lights[0];

	const sunDir: Vec3 = sun ? normalize3(sub3(sun.directionOrPosition, worldPos)) : [0, 1, 0];

	return packSceneLighting({

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



export function scaleTessellationBudget(

	t: TessellationSettings,

	scale: number

): TessellationSettings {

	return {

		...t,

		vertexBudgetMillions: t.vertexBudgetMillions * scale,

		detail: t.detail * Math.sqrt(scale)

	};

}



/** Per-body tessellation scale: primary full budget; secondaries share {@link SECONDARY_TESSELLATION_BUDGET_SCALE}. */

export function tessellationBudgetScaleForBody(

	bodyId: string,

	primaryId: string | null,

	totalTargets: number

): number | undefined {

	if (!primaryId || bodyId === primaryId) return undefined;

	const secondaryCount = totalTargets - 1;

	if (secondaryCount <= 0) return undefined;

	return SECONDARY_TESSELLATION_BUDGET_SCALE / secondaryCount;

}



/**

 * Every procedural planet/moon in the draw list with a visible cross-fade (blend > 0),

 * ordered largest on-screen first. The selected body is moved to the front when present.

 * Capped at {@link MAX_PROCEDURAL_BODIES} as a GPU/perf safety limit.

 */

export function selectProceduralTargets(

	drawList: DrawItem[],

	scene: PlanetScene,

	animated: PlanetScene,

	selectedId: string | null,

	maxBodies = MAX_PROCEDURAL_BODIES

): ProceduralRenderTarget[] {

	const candidates: ProceduralRenderTarget[] = [];

	for (const item of drawList) {

		if (item.blend <= 0 || !item.screen) continue;

		const node = scene.nodes.get(item.id);

		if (!node || node.kind !== 'body' || !isProceduralTerrainBody(node)) continue;

		candidates.push({

			id: item.id,

			body: node,

			worldPos: item.worldPos,

			rotation: getWorldTransform(animated, item.id).rotation,

			blend: item.blend,

			screenDepth: item.screen.depth,

			screenRadiusPx: item.screenRadiusPx

		});

	}

	if (candidates.length === 0) return [];



	candidates.sort((a, b) => b.screenRadiusPx - a.screenRadiusPx);



	if (selectedId) {

		const selIdx = candidates.findIndex((c) => c.id === selectedId);

		if (selIdx >= 0) {

			const selected = candidates[selIdx]!;

			return [selected, ...candidates.filter((c) => c.id !== selectedId)].slice(0, maxBodies);

		}

	}



	return candidates.slice(0, maxBodies);

}



/** Far-to-near order for alpha-blended terrain draws. */

export function sortProceduralDrawOrder(targets: ProceduralRenderTarget[]): ProceduralRenderTarget[] {

	return [...targets].sort((a, b) => b.screenDepth - a.screenDepth);

}


