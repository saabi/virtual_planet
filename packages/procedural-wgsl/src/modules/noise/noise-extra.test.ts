import { describe, expect, it } from 'vitest';

import { evalRidgedFbm3d } from '../../../../graph/src/primitives/ridgedFbm.js';
import { evalSimplex3d } from '../../../../graph/src/primitives/simplex.js';
import { NOISE_PERLIN3D_SOURCE } from './perlin3d.js';
import { NOISE_RIDGED_FBM_MODULE } from './ridgedFbm.js';
import { NOISE_SIMPLEX_MODULE } from './simplex.js';

describe('extra noise WGSL modules', () => {
	it('noise.simplex exposes simplex3d entry matching graph CPU semantics', () => {
		expect(NOISE_SIMPLEX_MODULE.id).toBe('noise.simplex');
		expect(NOISE_SIMPLEX_MODULE.source).toContain('fn simplex3d(');
		expect(NOISE_SIMPLEX_MODULE.source).toContain('SIMPLEX_PERM');
		expect(NOISE_SIMPLEX_MODULE.source).toContain('return 32.0 * (n0 + n1 + n2 + n3);');

		const value = evalSimplex3d(0.75, -1.25, 2.0);
		expect(value).toBeCloseTo(0.434_590_625, 6);
		expect(Math.abs(value)).toBeLessThanOrEqual(1.0001);
	});

	it('noise.simplex uses the same permutation table as noise.perlin3d', () => {
		const permMatch = NOISE_SIMPLEX_MODULE.source.match(
			/const SIMPLEX_PERM: array<u32, 512> = array<u32, 512>\(([\s\S]*?)\);/
		);
		const perlinMatch = NOISE_PERLIN3D_SOURCE.match(
			/const PERM: array<u32, 512> = array<u32, 512>\(([\s\S]*?)\);/
		);
		expect(permMatch?.[1]).toBe(perlinMatch?.[1]);
	});

	it('noise.ridgedFbm exposes ridgedFbm and depends on noise.perlin3d', () => {
		expect(NOISE_RIDGED_FBM_MODULE.id).toBe('noise.ridgedFbm');
		expect(NOISE_RIDGED_FBM_MODULE.source).toContain('fn ridgedFbm(');
		expect(NOISE_RIDGED_FBM_MODULE.dependencies).toEqual(['noise.perlin3d']);
		expect(NOISE_RIDGED_FBM_MODULE.source).toContain('perlin3d(position * frequency)');

		const value = evalRidgedFbm3d(1.0, 2.0, 3.0, 4, 0.5, 2.0, 1.0);
		expect(value).toBeCloseTo(1.875, 6);
		expect(value).toBeGreaterThanOrEqual(0);
	});
});
