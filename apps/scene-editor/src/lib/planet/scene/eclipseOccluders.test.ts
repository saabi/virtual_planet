import { describe, expect, it } from 'vitest';
import { evaluateScene } from './driver.js';
import { collectEclipseOccluders, diskObscuration } from './eclipseOccluders.js';
import { createToySolarSystemScene } from './solarSystem.js';

describe('diskObscuration', () => {
	it('handles no overlap and full coverage', () => {
		expect(diskObscuration(0.1, 0.05, 0.2)).toBe(0);
		expect(diskObscuration(0.1, 0.2, 0)).toBeCloseTo(1, 6);
	});

	it('handles centered smaller occluders', () => {
		expect(diskObscuration(0.1, 0.05, 0)).toBeCloseTo(0.25, 6);
	});

	it('is partial in the penumbra', () => {
		const v = diskObscuration(0.1, 0.1, 0.1);
		expect(v).toBeGreaterThan(0);
		expect(v).toBeLessThan(1);
	});
});

describe('collectEclipseOccluders', () => {
	it('finds Luna-F as an eclipse candidate for Ferro near alignment', () => {
		const scene = evaluateScene(createToySolarSystemScene(), 6.35);
		const set = collectEclipseOccluders(scene, 'ss-ferro', { marginRad: 0.05 });
		expect(set.enabled).toBe(true);
		expect(set.sunRadius).toBeGreaterThan(0);
		expect(set.occluders.map((o) => o.id)).toContain('ss-luna-f');
	});
});
