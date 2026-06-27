import { describe, expect, it } from 'vitest';

import { getPrimitive, listPrimitives } from '../../registry.js';
import { evalHsv2rgb } from './hsv2rgb.js';
import { evalLinearToSrgb } from './linearToSrgb.js';
import { evalSrgbToLinear } from './srgbToLinear.js';
import './index.js';

describe('harvested colour primitives', () => {
	it('registers without id collisions', () => {
		const ids = listPrimitives().map((primitive) => primitive.id);
		expect(ids).toContain('color.srgbToLinear');
		expect(ids).toContain('color.linearToSrgb');
		expect(ids).toContain('color.hsv2rgb');
	});

	it('color.srgbToLinear decodes with gamma 2.2', () => {
		const srgb: [number, number, number] = [0.5, 0.5, 0.5];
		const linear = evalSrgbToLinear(srgb);
		expect(linear[0]).toBeCloseTo(0.5 ** 2.2, 6);
		expect(
			getPrimitive('color.srgbToLinear')!.evalCPU!({
				inputs: { srgb },
				params: {}
			}).linear
		).toEqual(linear);
	});

	it('color.linearToSrgb encodes with gamma 2.2', () => {
		const srgb = evalLinearToSrgb([0.5, 0.5, 0.5]);
		expect(srgb[0]).toBeCloseTo(0.5 ** (1 / 2.2), 6);
	});

	it('color.hsv2rgb returns pure red at h=0', () => {
		expect(evalHsv2rgb(0, 1, 1)).toEqual([1, 0, 0]);
		expect(
			getPrimitive('color.hsv2rgb')!.evalCPU!({
				inputs: {},
				params: { h: 0, s: 1, v: 1 }
			}).rgb
		).toEqual([1, 0, 0]);
	});
});
