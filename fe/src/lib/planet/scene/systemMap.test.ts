import { describe, expect, it } from 'vitest';
import { orbitPathLocal } from './orbit.js';
import { fitView, pickNearest, projectToScreen, xzBounds } from './systemMap.js';
import { len3, type Vec3 } from '../math/vec.js';
import type { OrbitElements } from './types.js';

describe('orbitPathLocal', () => {
	it('traces a closed circle of radius a', () => {
		const o: OrbitElements = {
			semiMajorAxis: 500,
			eccentricity: 0,
			periodSeconds: 10,
			phaseAtEpoch: 0,
			periapsisAngle: 0
		};
		const pts = orbitPathLocal(o, 64);
		expect(pts.length).toBe(64);
		for (const p of pts) {
			expect(p[1]).toBe(0);
			expect(len3(p)).toBeCloseTo(500, 4);
		}
	});

	it('spans periapsis a(1−e) to apoapsis a(1+e) for an ellipse', () => {
		const o: OrbitElements = {
			semiMajorAxis: 1000,
			eccentricity: 0.4,
			periodSeconds: 10,
			phaseAtEpoch: 0,
			periapsisAngle: 0.5
		};
		const radii = orbitPathLocal(o, 128).map((p) => len3(p));
		expect(Math.min(...radii)).toBeCloseTo(600, 0); // a(1−e)
		expect(Math.max(...radii)).toBeCloseTo(1400, 0); // a(1+e)
	});
});

describe('system map projection', () => {
	const pts: Vec3[] = [
		[-100, 0, -50],
		[100, 0, 50],
		[0, 99, 0] // y ignored
	];

	it('computes XZ bounds ignoring y', () => {
		expect(xzBounds(pts)).toEqual({ minX: -100, maxX: 100, minZ: -50, maxZ: 50 });
		expect(xzBounds([])).toBeNull();
	});

	it('fits bounds centered, with uniform scale', () => {
		const view = fitView(xzBounds(pts), 400, 400, 0);
		expect(view.worldCenterX).toBe(0);
		expect(view.worldCenterZ).toBe(0);
		// X span 200 over 400px → 2 px/unit; Z span 100 → 4; uniform = min = 2.
		expect(view.scale).toBeCloseTo(2, 6);
		// Center world maps to screen center.
		expect(projectToScreen(view, 0, 0)).toEqual([200, 200]);
		// World x=100 → 200 + 100*2 = 400.
		expect(projectToScreen(view, 100, 0)[0]).toBeCloseTo(400, 6);
	});

	it('degenerate/empty bounds give a centered unit view', () => {
		const view = fitView(null, 300, 200, 10);
		expect(projectToScreen(view, 0, 0)).toEqual([150, 100]);
	});
});

describe('pickNearest', () => {
	const screen = [
		{ id: 'a', x: 10, y: 10 },
		{ id: 'b', x: 100, y: 100 },
		{ id: 'c', x: 105, y: 102 }
	];

	it('returns the closest point within the radius', () => {
		expect(pickNearest(screen, 12, 11, 8)).toBe('a');
		expect(pickNearest(screen, 101, 101, 8)).toBe('b'); // b closer than c
	});

	it('returns null when nothing is within the radius', () => {
		expect(pickNearest(screen, 500, 500, 8)).toBeNull();
	});
});
