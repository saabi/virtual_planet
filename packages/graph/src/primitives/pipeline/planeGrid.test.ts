import { describe, expect, it } from 'vitest';

import {
	planeGridMeshPositions,
	planeGridPosition,
	planeGridVertexCount
} from './planeGrid.js';

describe('planeGrid CPU', () => {
	it('emits six triangle-list vertices for a 2×2 corner grid', () => {
		expect(planeGridVertexCount(2, 2)).toBe(6);
	});

	it('returns fullscreen-quad corners at resU/resV = 2', () => {
		expect(planeGridPosition(0, 2, 2)).toEqual([-1, 1, 0]);
		expect(planeGridPosition(1, 2, 2)).toEqual([1, 1, 0]);
		expect(planeGridPosition(2, 2, 2)).toEqual([-1, -1, 0]);
		expect(planeGridPosition(4, 2, 2)).toEqual([1, -1, 0]);
		expect(planeGridPosition(5, 2, 2)).toEqual([-1, -1, 0]);
	});

	it('flattens every vertex into the mesh output buffer', () => {
		const mesh = planeGridMeshPositions(2, 2);
		expect(mesh).toHaveLength(18);
		expect(mesh.slice(0, 3)).toEqual([-1, 1, 0]);
	});
});
