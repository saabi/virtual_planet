import { describe, expect, it } from 'vitest';

import {
	DEFAULT_PLANE_GRID_TRANSFORM,
	planeGridEulerRotate,
	planeGridMeshPositions,
	planeGridPosition,
	planeGridVertexCount
} from './planeGrid.js';

describe('planeGrid CPU', () => {
	it('emits six triangle-list vertices for a 2×2 corner grid', () => {
		expect(planeGridVertexCount(2, 2)).toBe(6);
	});

	it('returns fullscreen-quad corners at resU/resV = 2 with default transform', () => {
		expect(planeGridPosition(0, 2, 2)).toEqual([-1, 1, 0]);
		expect(planeGridPosition(1, 2, 2)).toEqual([1, 1, 0]);
		expect(planeGridPosition(2, 2, 2)).toEqual([-1, -1, 0]);
		expect(planeGridPosition(4, 2, 2)).toEqual([1, -1, 0]);
		expect(planeGridPosition(5, 2, 2)).toEqual([-1, -1, 0]);
	});

	it('scales the grid by width and height', () => {
		const transform = { ...DEFAULT_PLANE_GRID_TRANSFORM, width: 4, height: 2 };
		expect(planeGridPosition(0, 2, 2, transform)).toEqual([-2, 1, 0]);
		expect(planeGridPosition(1, 2, 2, transform)).toEqual([2, 1, 0]);
	});

	it('rotates the grid with Euler XYZ (π/2 about X maps +Y to +Z)', () => {
		const halfPi = Math.PI / 2;
		const transform = { ...DEFAULT_PLANE_GRID_TRANSFORM, rotationX: halfPi };
		expect(planeGridPosition(0, 2, 2, transform)[0]).toBeCloseTo(-1, 6);
		expect(planeGridPosition(0, 2, 2, transform)[1]).toBeCloseTo(0, 6);
		expect(planeGridPosition(0, 2, 2, transform)[2]).toBeCloseTo(1, 6);
		const rotated = planeGridEulerRotate(0, 1, 0, halfPi, 0, 0);
		expect(rotated[0]).toBeCloseTo(0, 6);
		expect(rotated[1]).toBeCloseTo(0, 6);
		expect(rotated[2]).toBeCloseTo(1, 6);
	});

	it('flattens every vertex into the mesh output buffer', () => {
		const mesh = planeGridMeshPositions(2, 2);
		expect(mesh).toHaveLength(18);
		expect(mesh.slice(0, 3)).toEqual([-1, 1, 0]);
	});
});
