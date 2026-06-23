import { describe, expect, it } from 'vitest';
import {
	applyFreeFlyLook,
	freeFlyToOrbit,
	orbitEyeToFreeFly,
	stepFreeFly,
	type FreeFlyState
} from './freeFly.js';
import type { OrbitCamera } from '../scene3d/orbitCamera.js';

const fly: FreeFlyState = {
	position: [1e6, 0, 0],
	rotation: [0, 0, 0, 1]
};

describe('freeFly', () => {
	it('stepFreeFly moves along forward for W', () => {
		const next = stepFreeFly(fly, { w: true, a: false, s: false, d: false, q: false, e: false, shift: false }, 1, 1000);
		expect(next.position[2]).toBeLessThan(fly.position[2]);
		expect(next.position[0]).toBeCloseTo(fly.position[0], 3);
		expect(next.position[1]).toBeCloseTo(fly.position[1], 3);
	});

	it('stepFreeFly is unchanged with no keys', () => {
		const next = stepFreeFly(fly, { w: false, a: false, s: false, d: false, q: false, e: false, shift: false }, 1, 1000);
		expect(next.position).toEqual(fly.position);
		expect(next.rotation).toEqual(fly.rotation);
	});

	it('applyFreeFlyLook changes rotation', () => {
		const next = applyFreeFlyLook(fly.rotation, 10, 5);
		expect(next).not.toEqual(fly.rotation);
	});

	it('orbitEyeToFreeFly and freeFlyToOrbit round-trip', () => {
		const cam: OrbitCamera = { azimuth: 0.6, elevation: 0.35, distance: 1e7, target: [2e5, 0, -1e5] };
		const ff = orbitEyeToFreeFly(cam);
		const back = freeFlyToOrbit(ff, cam.target);
		expect(back.distance).toBeCloseTo(cam.distance, -2);
		expect(back.azimuth).toBeCloseTo(cam.azimuth, 2);
		expect(back.elevation).toBeCloseTo(cam.elevation, 2);
	});
});
