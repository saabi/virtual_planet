import { describe, expect, it } from 'vitest';
import { createDefaultViewportPrefs } from './viewportPrefs.js';
import {
	coerceSceneViewSettings,
	coerceViewportPrefs,
	defaultSceneViewSettings
} from './sceneViewSettings.js';

describe('coerceViewportPrefs', () => {
	it('returns defaults for non-object input', () => {
		expect(coerceViewportPrefs(null)).toEqual(createDefaultViewportPrefs());
		expect(coerceViewportPrefs('nope')).toEqual(createDefaultViewportPrefs());
	});

	it('fills missing fields from defaults (forward compatible)', () => {
		const d = createDefaultViewportPrefs();
		const got = coerceViewportPrefs({ lod: { proceduralAboveRadiusPx: 50 } });
		expect(got.lod.proceduralAboveRadiusPx).toBe(50);
		// missing siblings fall back to defaults
		expect(got.lod.sphereAboveRadiusPx).toBe(d.lod.sphereAboveRadiusPx);
		expect(got.tessellation).toEqual(d.tessellation);
		expect(got.atmosphereIntegrateSteps).toBe(d.atmosphereIntegrateSteps);
	});

	it('drops unknown fields and rejects bad enum / number values', () => {
		const got = coerceViewportPrefs({
			atmosphere: { blendMode: 'bogus' },
			atmosphereIntegrateSteps: 'lots',
			lod: { proceduralAboveRadiusPx: Number.NaN },
			junk: 123
		});
		const d = createDefaultViewportPrefs();
		expect(got.atmosphere.blendMode).toBe(d.atmosphere.blendMode);
		expect(got.atmosphereIntegrateSteps).toBe(d.atmosphereIntegrateSteps);
		expect(got.lod.proceduralAboveRadiusPx).toBe(d.lod.proceduralAboveRadiusPx);
		expect('junk' in got).toBe(false);
	});

	it('keeps valid hardware-alpha blend mode', () => {
		expect(coerceViewportPrefs({ atmosphere: { blendMode: 'hardware-alpha' } }).atmosphere.blendMode).toBe(
			'hardware-alpha'
		);
	});
});

describe('coerceSceneViewSettings', () => {
	it('defaults an empty blob', () => {
		expect(coerceSceneViewSettings({})).toEqual(defaultSceneViewSettings());
	});

	it('validates materialDebug and lookMode, keeping valid values', () => {
		const got = coerceSceneViewSettings({ materialDebug: 'not-a-mode', lookMode: 'horizon' });
		expect(got.materialDebug).toBe('off');
		expect(got.lookMode).toBe('horizon');
	});
});
