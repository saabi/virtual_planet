import { describe, expect, it } from 'vitest';
import { packCompositeUniform } from './compositePass.js';

describe('packCompositeUniform', () => {
	it('lays out mask (vec4) then params (vec4) as 8 floats', () => {
		const u = packCompositeUniform({ x: 600, y: 400, r0: 120, r1: 162 }, 0.5, 1200, 800);
		expect(Array.from(u)).toEqual([600, 400, 120, 162, 0.5, 1200, 800, 0]);
	});
});
