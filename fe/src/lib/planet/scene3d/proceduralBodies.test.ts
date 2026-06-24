import { describe, expect, it } from 'vitest';
import {
	MAX_PROCEDURAL_BODIES,
	scaleTessellationBudget,
	selectProceduralTargets,
	sortProceduralDrawOrder,
	tessellationBudgetScaleForBody
} from './proceduralBodies.js';
import { DEFAULT_TESSELLATION } from '../patches/tessellationSettings.js';
import type { DrawItem } from './drawList.js';
import type { Vec3 } from '../math/vec.js';
import type { BodyNode, PlanetScene, Quat } from '../scene/types.js';

function body(id: string, bodyType: BodyNode['bodyType'] = 'planet'): BodyNode {
	return {
		id,
		name: id,
		parentId: 'root',
		kind: 'body',
		enabled: true,
		transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
		bodyType,
		radiusMeters: 6.371e6,
		standIn: false
	};
}

function sceneWith(...nodes: BodyNode[]): PlanetScene {
	const nodesMap = new Map<string, BodyNode>(nodes.map((n) => [n.id, n]));
	return { rootId: 'root', nodes: nodesMap };
}

function drawItem(
	id: string,
	blend: number,
	screenRadiusPx: number,
	depth: number
): DrawItem {
	return {
		id,
		bodyType: 'planet',
		radiusMeters: 6.371e6,
		worldPos: [0, 0, 0],
		worldScale: [1, 1, 1],
		screen: { x: 100, y: 100, depth },
		screenRadiusPx,
		lod: 'procedural',
		blend
	};
}

describe('selectProceduralTargets', () => {
	const animated = sceneWith(body('a'), body('b'), body('c'));

	it('returns empty when no procedural candidates', () => {
		expect(
			selectProceduralTargets(
				[drawItem('a', 0, 200, 1)],
				animated,
				animated,
				'a'
			)
		).toEqual([]);
	});

	it('returns every visible procedural candidate sorted by on-screen size', () => {
		const list = [
			drawItem('a', 1, 120, 3),
			drawItem('b', 1, 200, 2),
			drawItem('c', 1, 80, 4)
		];
		const got = selectProceduralTargets(list, animated, animated, null);
		expect(got.map((t) => t.id)).toEqual(['b', 'a', 'c']);
		expect(got).toHaveLength(3);
	});

	it('caps at MAX_PROCEDURAL_BODIES when the view is crowded', () => {
		const nodes = Array.from({ length: 10 }, (_, i) => body(`b${i}`));
		const crowded = sceneWith(...nodes);
		const list = nodes.map((n, i) => drawItem(n.id, 1, 200 - i, i + 1));
		const got = selectProceduralTargets(list, crowded, crowded, null);
		expect(got).toHaveLength(MAX_PROCEDURAL_BODIES);
		expect(got[0]!.id).toBe('b0');
	});

	it('keeps the selected body primary even when smaller on screen', () => {
		const list = [drawItem('a', 1, 80, 2), drawItem('b', 1, 200, 3)];
		const got = selectProceduralTargets(list, animated, animated, 'a');
		expect(got.map((t) => t.id)).toEqual(['a', 'b']);
	});
});

describe('sortProceduralDrawOrder', () => {
	it('sorts far to near by clip depth', () => {
		const targets = [
			{
				id: 'near',
				body: body('near'),
				worldPos: [0, 0, 0] as Vec3,
				rotation: [0, 0, 0, 1] as Quat,
				renderRadius: 6.371e6,
				blend: 1,
				screenDepth: 1,
				screenRadiusPx: 100
			},
			{
				id: 'far',
				body: body('far'),
				worldPos: [1, 0, 0] as Vec3,
				rotation: [0, 0, 0, 1] as Quat,
				renderRadius: 6.371e6,
				blend: 1,
				screenDepth: 5,
				screenRadiusPx: 100
			}
		];
		expect(sortProceduralDrawOrder(targets).map((t) => t.id)).toEqual(['far', 'near']);
	});
});

describe('tessellationBudgetScaleForBody', () => {
	it('gives the primary the full budget and splits secondaries', () => {
		expect(tessellationBudgetScaleForBody('a', 'a', 3)).toBeUndefined();
		expect(tessellationBudgetScaleForBody('b', 'a', 3)).toBeCloseTo(0.35 / 2);
	});
});

describe('scaleTessellationBudget', () => {
	it('scales vertex budget and detail for secondary bodies', () => {
		const scaled = scaleTessellationBudget(DEFAULT_TESSELLATION, 0.25);
		expect(scaled.vertexBudgetMillions).toBeCloseTo(DEFAULT_TESSELLATION.vertexBudgetMillions * 0.25);
		expect(scaled.detail).toBeCloseTo(DEFAULT_TESSELLATION.detail * 0.5);
	});
});
