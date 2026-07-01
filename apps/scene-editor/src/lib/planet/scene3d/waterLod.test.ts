import { describe, expect, it } from 'vitest';
import { selectWaterTargets } from './waterLod.js';
import type { DrawItem } from './drawList.js';
import type { BodyNode, PlanetScene, SceneNode } from '../scene/types.js';

function root(): SceneNode {
	return {
		id: 'root',
		name: 'root',
		parentId: null,
		kind: 'group',
		enabled: true,
		transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
	};
}

function body(overrides: Partial<BodyNode> = {}): BodyNode {
	return {
		id: 'body',
		name: 'body',
		parentId: 'root',
		kind: 'body',
		enabled: true,
		transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
		bodyType: 'planet',
		radiusMeters: 100,
		standIn: false,
		appearance: {
			preset: 'twirly',
			overrides: {
				voronoi_amplitude: 0.1,
				detail_amplitude: 0.1,
				water_level: 0.75,
				render_water: 1
			}
		},
		...overrides
	};
}

function scene(node: BodyNode): PlanetScene {
	return {
		rootId: 'root',
		nodes: new Map([
			['root', root()],
			[node.id, node]
		])
	};
}

function drawItem(overrides: Partial<DrawItem> = {}): DrawItem {
	return {
		id: 'body',
		bodyType: 'planet',
		radiusMeters: 100,
		worldPos: [0, 0, 0],
		worldScale: [2, 2, 2],
		screen: { x: 0, y: 0, depth: 1000 },
		screenRadiusPx: 160,
		lod: 'mesh',
		terrainBlend: 1,
		displacementBlend: 1,
		heightBlend: 1,
		atmosphereBlend: 1,
		...overrides
	};
}

describe('selectWaterTargets', () => {
	it('uses terrain render radius when computing sea level', () => {
		const node = body();
		const s = scene(node);
		const [target] = selectWaterTargets([drawItem()], s, s);

		// render radius = 100 * world scale 2 = 200.
		// amplitude = (0.1 + 0.1) * 200 = 40.
		// sea offset = 40 * (0.75 - 0.5) = 10.
		expect(target?.seaLevelRadiusMeters).toBeCloseTo(210);
	});

	it('skips bodies with render_water disabled', () => {
		const node = body({ appearance: { preset: 'twirly', overrides: { render_water: 0 } } });
		const s = scene(node);
		expect(selectWaterTargets([drawItem()], s, s)).toEqual([]);
	});
});
