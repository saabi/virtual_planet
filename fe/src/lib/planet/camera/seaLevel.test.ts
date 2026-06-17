import { describe, expect, it } from 'vitest';
import { PLANET_PRESETS } from '../params/presets.js';
import {
	altitudeBounds,
	altitudeToDistance,
	distanceToAltitude,
	mapLogSlider,
	seaLevelOffsetMeters,
	seaLevelRadius,
	unmapLogSlider,
	nudgeAltitudeASL
} from './seaLevel.js';

describe('seaLevel', () => {
	it('matches GPU sea level offset for starter preset', () => {
		const p = PLANET_PRESETS.starter;
		expect(seaLevelOffsetMeters(p)).toBeCloseTo(-0.1);
		expect(seaLevelRadius(p)).toBeCloseTo(99.9);
	});

	it('round-trips distance and altitude ASL', () => {
		const p = PLANET_PRESETS.twirly;
		const alt = 220;
		const dist = altitudeToDistance(p, alt);
		expect(distanceToAltitude(p, dist)).toBeCloseTo(alt);
	});

	it('preserves legacy default view distance as ASL', () => {
		const p = PLANET_PRESETS.starter;
		expect(distanceToAltitude(p, 320)).toBeCloseTo(220.1, 0);
	});

	it('altitude bounds min scales with mountainous presets', () => {
		const flat = altitudeBounds(PLANET_PRESETS.starter);
		const tall = altitudeBounds(PLANET_PRESETS.normie);
		expect(tall.min).toBeGreaterThan(flat.min);
		expect(tall.max).toBeGreaterThanOrEqual(flat.max);
	});

	it('log slider maps endpoints', () => {
		const min = 1;
		const max = 1000;
		expect(mapLogSlider(0, min, max)).toBeCloseTo(min);
		expect(mapLogSlider(1, min, max)).toBeCloseTo(max);
		const mid = mapLogSlider(0.5, min, max);
		expect(unmapLogSlider(mid, min, max)).toBeCloseTo(0.5, 2);
	});

	it('nudges altitude correctly for zooming in and out', () => {
		const p = PLANET_PRESETS.starter;
		const baseAlt = 100;
		const zoomedOut = nudgeAltitudeASL(p, baseAlt, 100);
		expect(zoomedOut).toBeGreaterThan(baseAlt);
		const zoomedIn = nudgeAltitudeASL(p, baseAlt, -100);
		expect(zoomedIn).toBeLessThan(baseAlt);
	});
});
