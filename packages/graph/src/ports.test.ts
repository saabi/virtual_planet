import { describe, expect, it } from 'vitest';
import { compatibleDataTypes } from './ports.js';

describe('@virtual-planet/graph ports', () => {
	it('allows vec2f to vec3f promotion', () => {
		expect(compatibleDataTypes('vec2f', 'vec3f')).toBe(true);
	});

	it('rejects unrelated type pairs', () => {
		expect(compatibleDataTypes('vec2f', 'f32')).toBe(false);
	});
});
