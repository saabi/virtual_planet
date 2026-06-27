import { describe, expect, it } from 'vitest';
import type { Mat4, Plane, Vec3 } from './camera.js';
import { frustumFromViewProjection, pointerRay } from './camera.js';

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const len = (n: Vec3) => Math.hypot(n[0], n[1], n[2]);
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const hasPlane = (planes: Plane[], n: Vec3, c: number) =>
	planes.some(
		(p) =>
			near(p.normal[0], n[0]) &&
			near(p.normal[1], n[1]) &&
			near(p.normal[2], n[2]) &&
			near(p.constant, c)
	);

describe('@virtual-planet/runtime-cpu camera', () => {
	it('extracts six normalized frustum planes', () => {
		const f = frustumFromViewProjection(IDENTITY);
		expect(f.planes).toHaveLength(6);
		for (const p of f.planes) expect(near(len(p.normal), 1)).toBe(true);
	});

	it('identity frustum has the expected left/right planes and rejects an out-of-bounds point', () => {
		const f = frustumFromViewProjection(IDENTITY);
		expect(hasPlane(f.planes, [1, 0, 0], 1)).toBe(true);
		expect(hasPlane(f.planes, [-1, 0, 0], 1)).toBe(true);
		const outside: Vec3 = [2, 0, 0.5];
		expect(
			f.planes.some(
				(p) =>
					p.normal[0] * outside[0] +
						p.normal[1] * outside[1] +
						p.normal[2] * outside[2] +
						p.constant <
					0
			)
		).toBe(true);
	});

	it('pointer ray through identity points down +z from the near plane', () => {
		const r = pointerRay(0, 0, IDENTITY);
		expect(near(r.origin[0], 0) && near(r.origin[1], 0) && near(r.origin[2], 0)).toBe(true);
		expect(
			near(r.direction[0], 0) && near(r.direction[1], 0) && near(r.direction[2], 1)
		).toBe(true);
	});
});
