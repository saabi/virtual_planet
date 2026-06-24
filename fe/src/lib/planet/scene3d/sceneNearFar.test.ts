import { describe, expect, it } from 'vitest';
import { MAX_DEPTH_RATIO, NEAR_FLOOR, orbitNearFar, sceneNearFar } from './orbitCamera.js';
import type { Vec3 } from '../math/vec.js';

describe('sceneNearFar', () => {
	it('encloses every body so far ones stay inside the frustum', () => {
		const eye: Vec3 = [0, 0, 0];
		const bodies = [
			{ center: [1e7, 0, 0] as Vec3, radius: 1e6 },
			{ center: [0, 5e7, 0] as Vec3, radius: 2e6 }
		];
		const [near, far] = sceneNearFar(eye, bodies);
		// near is in front of the nearest surface; far is beyond the farthest.
		expect(near).toBeLessThanOrEqual(1e7 - 1e6);
		expect(far).toBeGreaterThanOrEqual(5e7 + 2e6);
	});

	it('clamps the near plane to NEAR_FLOOR when the eye is inside/at a body', () => {
		const eye: Vec3 = [5, 0, 0];
		const [near] = sceneNearFar(eye, [{ center: [0, 0, 0], radius: 10 }]);
		expect(near).toBe(NEAR_FLOOR);
	});

	it('caps far/near at MAX_DEPTH_RATIO (surface-close + a distant sibling)', () => {
		const eye: Vec3 = [1, 0, 0];
		const bodies = [
			{ center: [0, 0, 0] as Vec3, radius: 0 }, // eye 1 m away → tiny near
			{ center: [1e11, 0, 0] as Vec3, radius: 1e6 } // far sibling
		];
		const [near, far] = sceneNearFar(eye, bodies);
		expect(far / near).toBeCloseTo(MAX_DEPTH_RATIO, 3);
		expect(far).toBeCloseTo(near * MAX_DEPTH_RATIO, 3);
	});

	it('falls back to the distance-based range for an empty scene', () => {
		expect(sceneNearFar([0, 0, 0], [])).toEqual(orbitNearFar(1e7));
	});

	it('fits a single body, enclosing it with margin', () => {
		const eye: Vec3 = [0, 0, 0];
		const center: Vec3 = [2e7, 0, 0];
		const radius = 1e6;
		const [near, far] = sceneNearFar(eye, [{ center, radius }]);
		expect(near).toBeCloseTo((2e7 - radius) * 0.5, 0); // half the near-surface distance
		expect(near).toBeLessThanOrEqual(2e7 - radius); // in front of the near surface
		expect(far).toBeGreaterThanOrEqual((2e7 + radius) * 1.05); // beyond the far surface
		expect(far / near).toBeLessThan(MAX_DEPTH_RATIO);
	});
});
