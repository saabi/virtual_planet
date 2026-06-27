import { describe, expect, it } from 'vitest';
import { buildSurfaceMesh } from './surfaceMesh.js';

describe('buildSurfaceMesh', () => {
	it('plane grid has one face of vertices', () => {
		const mesh = buildSurfaceMesh('surface.plane', 4);
		expect(mesh.vertexCount).toBe(16);
		expect(mesh.indexCount).toBe(9 * 2 * 3);
	});

	it('cubeSphere has six faces', () => {
		const mesh = buildSurfaceMesh('surface.cubeSphere', 4);
		expect(mesh.vertexCount).toBe(16 * 6);
		expect(mesh.indexCount).toBe(6 * 9 * 2 * 3);
	});

	it('cubeSphere positions lie on the unit sphere', () => {
		const mesh = buildSurfaceMesh('surface.cubeSphere', 8);
		for (let i = 0; i < mesh.vertexCount; i++) {
			const x = mesh.positions[i * 3];
			const y = mesh.positions[i * 3 + 1];
			const z = mesh.positions[i * 3 + 2];
			expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
		}
	});

	it('plane center vertex is at the origin', () => {
		const mesh = buildSurfaceMesh('surface.plane', 3);
		const center = 4;
		expect(mesh.positions[center * 3]).toBeCloseTo(0, 6);
		expect(mesh.positions[center * 3 + 1]).toBeCloseTo(0, 6);
		expect(mesh.positions[center * 3 + 2]).toBeCloseTo(0, 6);
	});

	it('plane and cubeSphere produce different topology', () => {
		const plane = buildSurfaceMesh('surface.plane', 8);
		const sphere = buildSurfaceMesh('surface.cubeSphere', 8);
		expect(plane.vertexCount).toBeLessThan(sphere.vertexCount);
		expect(plane.indexCount).toBeLessThan(sphere.indexCount);
	});
});
