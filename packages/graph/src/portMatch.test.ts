import '@virtual-planet/graph';
import { describe, expect, it } from 'vitest';
import { compatibleConsumers, compatibleProducers } from './portMatch.js';

describe('portMatch', () => {
	it('compatibleConsumers lists vec4f consumers for a vec4f output', () => {
		const ids = compatibleConsumers('vec4f').map((match) => match.primitive.id);
		expect(ids).toContain('vector.vec4f.x');
		expect(ids).toContain('stage.fragment');
		expect(ids).not.toContain('constant.f32');
	});

	it('compatibleProducers lists f32 producers for an f32 input', () => {
		const ids = compatibleProducers('f32').map((match) => match.primitive.id);
		expect(ids).toContain('constant.f32');
		expect(ids).toContain('noise.worley2d');
		expect(ids).not.toContain('vector.vec4f');
	});

	it('respects vec2f to vec3f promotion on consumers', () => {
		const ids = compatibleConsumers('vec2f').map((match) => match.primitive.id);
		expect(ids).toContain('noise.perlin3d');
	});

	it('returns the first compatible port name in primitive order', () => {
		const fragment = compatibleConsumers('vec4f').find(
			(match) => match.primitive.id === 'stage.fragment'
		);
		expect(fragment?.portName).toBe('color');
	});
});
