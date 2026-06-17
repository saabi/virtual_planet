import { describe, expect, it } from 'vitest';
import {
	ATMOSPHERE_UNIFORM_SIZE,
	defaultAtmosphereParams,
	toGpuAtmosphereParams,
	writeAtmosphereParamsToBuffer
} from './atmosphereParams.js';

describe('atmosphereParams', () => {
	it('derives shell and scale height from planet radius', () => {
		const p = defaultAtmosphereParams(100, 0.5);
		expect(p.shellHeightMeters).toBe(20);
		expect(p.scaleHeightMeters).toBe(10);
		expect(p.groundFogDensity).toBe(0.5);
	});

	it('packs GPU atmosphere uniform with 64-byte size', () => {
		const gpu = toGpuAtmosphereParams(defaultAtmosphereParams(100), 100);
		const buf = new ArrayBuffer(ATMOSPHERE_UNIFORM_SIZE);
		writeAtmosphereParamsToBuffer(buf, 0, gpu);
		const view = new DataView(buf);
		expect(view.getFloat32(12, true)).toBe(100);
		expect(view.getFloat32(16, true)).toBe(120);
		expect(view.getFloat32(28, true)).toBeCloseTo(0.8);
		expect(view.getFloat32(48, true)).toBe(12);
	});

	it('zeros scattering when atmosphere is disabled', () => {
		const params = { ...defaultAtmosphereParams(100), enabled: false };
		const gpu = toGpuAtmosphereParams(params, 100);
		expect(gpu.rayleigh_strength).toBe(0);
		expect(gpu.mie_strength).toBe(0);
		expect(gpu.ground_fog_density).toBe(0);
		expect(gpu.sun_radiance).toBe(0);
		expect(gpu.integrate_steps).toBe(0);
	});
});
