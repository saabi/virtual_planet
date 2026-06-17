import { describe, expect, it } from 'vitest';
import {
	chooseOrbitPatchResolution,
	cubeFaceUvToPosition,
	cubeFaceUvToUnitDir,
	cubePatchVertexCount
} from './cubeSphere.js';
describe('cubeSphere mapping', () => {
	it('maps face center UV to axis direction', () => {
		const pos = cubeFaceUvToPosition(0, 0.5, 0.5);
		expect(pos[0]).toBeCloseTo(1, 5);
		expect(pos[1]).toBeCloseTo(0, 5);
		expect(pos[2]).toBeCloseTo(0, 5);
	});

	it('normalizes to unit direction', () => {
		const dir = cubeFaceUvToUnitDir(4, 0.25, 0.75);
		const len = Math.hypot(dir[0], dir[1], dir[2]);
		expect(len).toBeCloseTo(1, 5);
	});

	it('covers all six faces without NaN', () => {
		for (let face = 0; face < 6; face++) {
			const dir = cubeFaceUvToUnitDir(face, 0.1, 0.9);
			expect(Number.isFinite(dir[0])).toBe(true);
			expect(Number.isFinite(dir[1])).toBe(true);
			expect(Number.isFinite(dir[2])).toBe(true);
		}
	});

	it('raises tessellation when the camera moves closer', () => {
		expect(chooseOrbitPatchResolution(300, 100)).toBe(8);
		expect(chooseOrbitPatchResolution(150, 100)).toBe(16);
		expect(chooseOrbitPatchResolution(40, 100)).toBe(32);
		expect(chooseOrbitPatchResolution(10, 100)).toBe(64);
		expect(chooseOrbitPatchResolution(5, 100)).toBe(96);
		expect(cubePatchVertexCount(96)).toBe(96 * 96 * 6);
	});
});