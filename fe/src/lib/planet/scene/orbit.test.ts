import { describe, expect, it } from 'vitest';
import { advanceScene, orbitLocalPosition } from './orbit.js';
import type { OrbitElements, PlanetScene, SceneNode } from './types.js';
import { len3 } from '../math/vec.js';

const circular: OrbitElements = {
	semiMajorAxis: 1000,
	eccentricity: 0,
	periodSeconds: 100,
	phaseAtEpoch: 0,
	periapsisAngle: 0
};

describe('orbitLocalPosition', () => {
	it('traces a circle of constant radius in the XZ plane', () => {
		for (const t of [0, 17, 50, 83]) {
			const p = orbitLocalPosition(circular, t);
			expect(p[1]).toBe(0); // coplanar, y up
			expect(len3(p)).toBeCloseTo(1000, 6);
		}
	});

	it('advances by phase and returns to start after a full period', () => {
		expect(orbitLocalPosition(circular, 0)).toEqual([1000, 0, 0]);
		const quarter = orbitLocalPosition(circular, 25); // +x → +z
		expect(quarter[0]).toBeCloseTo(0, 6);
		expect(quarter[2]).toBeCloseTo(1000, 6);
		const full = orbitLocalPosition(circular, 100);
		expect(full[0]).toBeCloseTo(1000, 6);
		expect(full[2]).toBeCloseTo(0, 6);
	});

	it('hits periapsis and apoapsis for an eccentric orbit', () => {
		const e = 0.5;
		const ell: OrbitElements = { ...circular, eccentricity: e };
		// t=0 (mean anomaly 0) → periapsis = a(1−e); half period → apoapsis = a(1+e).
		expect(len3(orbitLocalPosition(ell, 0))).toBeCloseTo(1000 * (1 - e), 4);
		expect(len3(orbitLocalPosition(ell, 50))).toBeCloseTo(1000 * (1 + e), 4);
	});
});

describe('advanceScene', () => {
	function scene(): PlanetScene {
		const nodes = new Map<string, SceneNode>();
		nodes.set('root', {
			id: 'root',
			name: 'root',
			parentId: null,
			kind: 'group',
			enabled: true,
			transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
		});
		nodes.set('orbiter', {
			id: 'orbiter',
			name: 'orbiter',
			parentId: 'root',
			kind: 'body',
			enabled: true,
			transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
			bodyType: 'planet',
			radiusMeters: 500_000,
			standIn: false,
			orbit: circular,
			spinPeriodSeconds: 40
		});
		nodes.set('static', {
			id: 'static',
			name: 'static',
			parentId: 'root',
			kind: 'group',
			enabled: true,
			transform: { position: [7, 8, 9], rotation: [0, 0, 0, 1] }
		});
		return { rootId: 'root', nodes };
	}

	it('drives orbiting positions and spinning rotations, leaves others untouched', () => {
		const s0 = scene();
		const s = advanceScene(s0, 25);
		const orbiter = s.nodes.get('orbiter')!;
		expect(orbiter.transform.position[0]).toBeCloseTo(0, 6);
		expect(orbiter.transform.position[2]).toBeCloseTo(1000, 6);
		// Spin advanced (rotation no longer identity).
		expect(orbiter.transform.rotation).not.toEqual([0, 0, 0, 1]);
		// Static node is unchanged.
		expect(s.nodes.get('static')!.transform.position).toEqual([7, 8, 9]);
		// Immutability: the input scene's orbiter is still at the origin.
		expect(s0.nodes.get('orbiter')!.transform.position).toEqual([0, 0, 0]);
	});

	it('returns the same scene reference when nothing animates', () => {
		const nodes = new Map<string, SceneNode>();
		nodes.set('root', {
			id: 'root',
			name: 'root',
			parentId: null,
			kind: 'group',
			enabled: true,
			transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
		});
		const s = { rootId: 'root', nodes };
		expect(advanceScene(s, 123)).toBe(s);
	});
});
