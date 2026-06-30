import { describe, expect, it } from 'vitest';
import { Value } from '@virtual-planet/schema';

import { getPrimitive } from '../../registry.js';
import { planeParams } from './plane.js';
import './index.js';

describe('pipeline geometry primitives', () => {
	it('geometry.plane params default and coerce resU/resV', () => {
		const plane = getPrimitive('geometry.plane')!;
		expect(plane.wgsl).toEqual({ moduleId: 'geometry.plane', entry: 'planeGrid' });

		const empty = Value.Create(planeParams);
		expect(empty).toEqual({ resU: 16, resV: 16 });

		const coerced = Value.Convert(planeParams, { resU: '32', resV: 8 });
		expect(coerced).toEqual({ resU: 32, resV: 8 });
	});

	it('geometry.fullscreenPlane and geometry.plane are distinct sources', () => {
		const fullscreen = getPrimitive('geometry.fullscreenPlane')!;
		const plane = getPrimitive('geometry.plane')!;
		expect(fullscreen.id).not.toBe(plane.id);
		expect(fullscreen.params).not.toEqual(plane.params);
	});
});
