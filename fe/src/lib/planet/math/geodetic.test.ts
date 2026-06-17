import { describe, expect, it } from 'vitest';
import { geodeticToEcef, ecefToGeodetic } from './geodetic.js';
import { geodeticEcefRoundTrip } from './ecef.js';

describe('geodetic ↔ ECEF', () => {
	it('round-trips equator at sea level', () => {
		expect(
			geodeticEcefRoundTrip({ latRad: 0, lonRad: 0, altitudeMeters: 0 })
		).toBe(true);
	});

	it('round-trips mid-latitude with altitude', () => {
		const g = { latRad: 0.65, lonRad: -1.2, altitudeMeters: 1200 };
		const ecef = geodeticToEcef(g);
		const back = ecefToGeodetic(ecef);
		expect(Math.abs(back.latRad - g.latRad)).toBeLessThan(1e-6);
		expect(Math.abs(back.lonRad - g.lonRad)).toBeLessThan(1e-6);
		expect(Math.abs(back.altitudeMeters - g.altitudeMeters)).toBeLessThan(0.5);
	});
});
