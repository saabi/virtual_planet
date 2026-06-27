import { describe, expect, it } from 'vitest';

import { evalBias } from '../../../../graph/src/primitives/bias.js';
import { evalGain } from '../../../../graph/src/primitives/gain.js';
import { getPrimitive } from '../../../../graph/src/registry.js';
import '../../../../graph/src/primitives/abs.js';
import '../../../../graph/src/primitives/bias.js';
import '../../../../graph/src/primitives/gain.js';

import { MATH_ABS_MODULE, MATH_ABS_SOURCE } from './abs.js';
import { MATH_BIAS_MODULE, MATH_BIAS_SOURCE } from './bias.js';
import { MATH_GAIN_MODULE, MATH_GAIN_SOURCE } from './gain.js';

describe('math extra WGSL modules', () => {
	it('math.abs exposes stable id, entry, and non-recursive abs formula', () => {
		expect(MATH_ABS_MODULE.id).toBe('math.abs');
		expect(MATH_ABS_SOURCE).toContain('fn abs(x: f32) -> f32');
		expect(MATH_ABS_SOURCE).toContain('select(-x, x, x >= 0.0)');
	});

	it('math.abs matches graph evalCPU', () => {
		const evalAbs = getPrimitive('math.abs')!.evalCPU!;
		expect(evalAbs({ inputs: { x: -3.5 }, params: {} }).value).toBe(3.5);
		expect(evalAbs({ inputs: { x: 0 }, params: {} }).value).toBe(0);
		expect(evalAbs({ inputs: { x: 2.25 }, params: {} }).value).toBe(2.25);
	});

	it('math.bias exposes stable id, entry, and Perlin bias formula', () => {
		expect(MATH_BIAS_MODULE.id).toBe('math.bias');
		expect(MATH_BIAS_SOURCE).toContain('fn bias(x: f32, bias: f32) -> f32');
		expect(MATH_BIAS_SOURCE).toContain('(1.0 / bias - 2.0) * (1.0 - x) + 1.0');
	});

	it('math.bias matches graph evalCPU at identity and pull-down points', () => {
		expect(evalBias(0.5, 0.5)).toBeCloseTo(0.5);
		expect(evalBias(0.5, 0.25)).toBeCloseTo(0.25);
		expect(evalBias(0.25, 0.75)).toBeCloseTo(
			getPrimitive('math.bias')!.evalCPU!({ inputs: { x: 0.25 }, params: { bias: 0.75 } }).value as number
		);
	});

	it('math.gain exposes stable id, entry, dependency, and piecewise gain formula', () => {
		expect(MATH_GAIN_MODULE.id).toBe('math.gain');
		expect(MATH_GAIN_MODULE.dependencies).toEqual(['math.bias']);
		expect(MATH_GAIN_SOURCE).toContain('fn gain(x: f32, gain: f32) -> f32');
		expect(MATH_GAIN_SOURCE).toContain('0.5 * bias(2.0 * x, gain)');
		expect(MATH_GAIN_SOURCE).toContain('0.5 + 0.5 * bias(2.0 * x - 1.0, 1.0 - gain)');
	});

	it('math.gain matches graph evalCPU at identity points', () => {
		expect(evalGain(0.25, 0.5)).toBeCloseTo(0.25);
		expect(evalGain(0.75, 0.5)).toBeCloseTo(0.75);
		expect(evalGain(0.5, 0.5)).toBeCloseTo(0.5);
	});
});
