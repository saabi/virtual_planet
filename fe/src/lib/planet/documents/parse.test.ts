import { describe, expect, it } from 'vitest';
import { parseSnapshot } from './parse.js';
import { coerceSnapshot, defaultSnapshot } from './schema.js';
import { applySnapshot, toSnapshot } from './snapshot.js';
import { CURRENT_SNAPSHOT_VERSION } from './types.js';
import { DEFAULT_PRESET, PLANET_PRESETS } from '../params/presets.js';

describe('planet document parse', () => {
	it('round-trips a valid snapshot', () => {
		const source = toSnapshot({
			presetName: 'twirly',
			params: { ...PLANET_PRESETS.twirly, water_level: 0.33 },
			camera: {
				azimuth: 1.2,
				elevation: 0.4,
				distance: 250,
				altitudeMeters: 152.89,
				orbitSpeedRadPerSec: 0,
				lookAtHorizon: true
			}
		});
		const parsed = parseSnapshot(source);
		expect(parsed.snapshot).not.toBeNull();
		expect(parsed.rejectReason).toBeUndefined();
		expect(parsed.snapshot).toEqual(source);
	});

	it('drops unknown keys and fills missing fields from preset defaults', () => {
		const parsed = parseSnapshot({
			schemaVersion: 1,
			presetName: 'normie',
			extra: 'ignored',
			params: { water_level: 0.77, bogus: 123 },
			camera: { azimuth: 0.5 }
		});
		expect(parsed.snapshot).not.toBeNull();
		const applied = applySnapshot(parsed.snapshot!);
		expect(applied.params.water_level).toBe(0.77);
		expect(applied.params.radius).toBe(PLANET_PRESETS.normie.radius);
		expect(applied.camera.azimuth).toBe(0.5);
		expect(applied.camera.distance).toBe(defaultSnapshot().camera.distance);
	});

	it('falls back to default preset when preset name is invalid', () => {
		const parsed = parseSnapshot({
			schemaVersion: 1,
			presetName: 'not-a-real-preset',
			params: {},
			camera: {}
		});
		expect(parsed.snapshot?.presetName).toBe(DEFAULT_PRESET);
	});

	it('rejects snapshots newer than the app schema', () => {
		const parsed = parseSnapshot({
			schemaVersion: CURRENT_SNAPSHOT_VERSION + 1,
			presetName: 'normie',
			params: PLANET_PRESETS.normie,
			camera: defaultSnapshot().camera
		});
		expect(parsed.snapshot).toBeNull();
		expect(parsed.rejectReason).toBe('newer');
	});

	it('coerceSnapshot returns null for non-objects', () => {
		expect(coerceSnapshot(null)).toBeNull();
		expect(coerceSnapshot('bad')).toBeNull();
	});

	it('derives altitudeMeters from legacy distance-only camera saves', () => {
		const parsed = parseSnapshot({
			schemaVersion: CURRENT_SNAPSHOT_VERSION,
			presetName: 'starter',
			params: PLANET_PRESETS.starter,
			camera: { azimuth: 0.6, elevation: 0.35, distance: 320 }
		});
		expect(parsed.snapshot).not.toBeNull();
		const applied = applySnapshot(parsed.snapshot!);
		expect(applied.camera.altitudeMeters).toBeCloseTo(220.1, 0);
		expect(applied.camera.distance).toBeCloseTo(320, 0);
		expect(applied.camera.orbitSpeedRadPerSec).toBe(0);
	});

	it('persists new camera orbit fields in round-trip', () => {
		const source = toSnapshot({
			presetName: 'starter',
			params: PLANET_PRESETS.starter,
			camera: {
				azimuth: 0.5,
				elevation: 0.2,
				distance: 400,
				altitudeMeters: 300,
				orbitSpeedRadPerSec: 0.1
			}
		});
		const parsed = parseSnapshot(source);
		expect(parsed.snapshot?.camera.altitudeMeters).toBe(300);
		expect(parsed.snapshot?.camera.orbitSpeedRadPerSec).toBe(0.1);
	});
});
