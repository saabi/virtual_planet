import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIAL_OVERRIDES } from '../material/biomes.js';
import { writeMaterialOverrides, MATERIAL_OVERRIDES_UNIFORM_SIZE } from './materialOverrides.js';

describe('writeMaterialOverrides', () => {
	it('packs exposure, debug mode, fog density, and LOD blends into uniform buffer', () => {
		const buf = new ArrayBuffer(MATERIAL_OVERRIDES_UNIFORM_SIZE);
		writeMaterialOverrides(buf, {
			...DEFAULT_MATERIAL_OVERRIDES,
			exposure: 1.5,
			materialDebug: 'specular',
			fogDensity: 0.4,
			heightBlend: 0.5,
			displacementBlend: 0.75
		});
		const view = new DataView(buf);
		expect(view.getFloat32(0, true)).toBeCloseTo(1.5);
		expect(view.getFloat32(12, true)).toBe(4);
		expect(view.getFloat32(16, true)).toBeCloseTo(0.4);
		expect(view.getFloat32(32, true)).toBeCloseTo(0.5);
		expect(view.getFloat32(36, true)).toBeCloseTo(0.75);
	});
});
