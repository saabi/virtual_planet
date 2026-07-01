import { describe, expect, it } from 'vitest';
import { REFERENCE_PLANET_RADIUS, selectRenderMode } from './cameraModes.js';

describe('selectRenderMode', () => {
	it('keeps orbit for small planets at typical orbit altitude', () => {
		const radius = 100;
		const altitude = 220; // distance 320 − radius 100
		expect(selectRenderMode(altitude, 'orbit', radius)).toBe('orbit');
	});

	it('matches earth-scale thresholds at reference radius', () => {
		const altitude = 15_000;
		expect(selectRenderMode(altitude, 'orbit', REFERENCE_PLANET_RADIUS)).toBe('flight');
		expect(selectRenderMode(altitude, 'flight', REFERENCE_PLANET_RADIUS)).toBe('flight');
		expect(selectRenderMode(3_000, 'flight', REFERENCE_PLANET_RADIUS)).toBe('surface');
	});
});
