import { describe, expect, it } from 'vitest';
import {
	PLANET_PARAMS_BYTE_SIZE,
	toGpuPlanetParams,
	writePlanetParamsToBuffer
} from './planetParams';
import { DEFAULT_PRESET, PLANET_PRESETS } from './presets';

describe('writePlanetParamsToBuffer', () => {
	it('writes scalar params with 16-byte-aligned buffer size', () => {
		const buffer = new ArrayBuffer(PLANET_PARAMS_BYTE_SIZE);
		const source = PLANET_PRESETS[DEFAULT_PRESET];
		const params = toGpuPlanetParams(source, 1.5);

		writePlanetParamsToBuffer(buffer, 0, params);

		const view = new DataView(buffer);
		expect(view.getFloat32(0, true)).toBe(source.radius);
		expect(view.getFloat32(48, true)).toBe(source.water_level);
		expect(view.getFloat32(92, true)).toBe(1.5);
		expect(PLANET_PARAMS_BYTE_SIZE % 16).toBe(0);
	});
});
