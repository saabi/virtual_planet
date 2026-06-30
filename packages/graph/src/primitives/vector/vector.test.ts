import { describe, expect, it } from 'vitest';
import { Value } from '@virtual-planet/schema';

import { getPrimitive } from '../../registry.js';
import '../index.js';

describe('vector utility primitives', () => {
	it('registers scalar constants, vector constructors, and component extractors', () => {
		expect(getPrimitive('constant.f32')).toBeDefined();
		expect(getPrimitive('vector.vec2f')).toMatchObject({
			inputs: [
				{ name: 'x', dataType: 'f32' },
				{ name: 'y', dataType: 'f32' }
			],
			outputs: [{ name: 'value', dataType: 'vec2f' }]
		});
		expect(getPrimitive('vector.vec3f.z')).toMatchObject({
			inputs: [{ name: 'value', dataType: 'vec3f' }],
			outputs: [{ name: 'z', dataType: 'f32' }]
		});
		expect(getPrimitive('vector.vec4f.w')).toMatchObject({
			inputs: [{ name: 'value', dataType: 'vec4f' }],
			outputs: [{ name: 'w', dataType: 'f32' }]
		});
	});

	it('constant.f32 uses a TypeBox-backed default value', () => {
		const primitive = getPrimitive('constant.f32')!;
		expect(Value.Create(primitive.params)).toEqual({ value: 0 });
		expect(primitive.evalCPU!({ inputs: {}, params: { value: 2.5 } })).toEqual({ value: 2.5 });
	});

	it('constructs vec2f, vec3f, and vec4f from f32 components', () => {
		expect(
			getPrimitive('vector.vec2f')!.evalCPU!({ inputs: { x: 1, y: 2 }, params: {} })
		).toEqual({ value: [1, 2] });
		expect(
			getPrimitive('vector.vec3f')!.evalCPU!({ inputs: { x: 1, y: 2, z: 3 }, params: {} })
		).toEqual({ value: [1, 2, 3] });
		expect(
			getPrimitive('vector.vec4f')!.evalCPU!({
				inputs: { x: 1, y: 2, z: 3, w: 4 },
				params: {}
			})
		).toEqual({ value: [1, 2, 3, 4] });
	});

	it('extracts scalar components from vectors', () => {
		expect(
			getPrimitive('vector.vec2f.y')!.evalCPU!({ inputs: { value: [5, 6] }, params: {} })
		).toEqual({ y: 6 });
		expect(
			getPrimitive('vector.vec3f.z')!.evalCPU!({ inputs: { value: [5, 6, 7] }, params: {} })
		).toEqual({ z: 7 });
		expect(
			getPrimitive('vector.vec4f.w')!.evalCPU!({ inputs: { value: [5, 6, 7, 8] }, params: {} })
		).toEqual({ w: 8 });
	});
});
