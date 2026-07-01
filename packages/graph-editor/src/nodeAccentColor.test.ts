import '@world-lab/graph';
import { describe, expect, it } from 'vitest';
import { getPrimitive } from '@world-lab/graph';
import { nodeAccentColor } from './nodeAccentColor.js';

describe('nodeAccentColor', () => {
	it('returns null for off mode', () => {
		expect(nodeAccentColor('vector.vec4f', 'off')).toBeNull();
	});

	it('is deterministic per primitive in category mode', () => {
		const first = nodeAccentColor('noise.worley2d', 'category');
		const second = nodeAccentColor('noise.worley2d', 'category');
		expect(first).toBe(second);
		expect(first).toMatch(/^hsl\(/);
	});

	it('maps well-known categories to distinct curated accents', () => {
		const vector = nodeAccentColor('vector.vec4f', 'category');
		const noise = nodeAccentColor('noise.worley2d', 'category');
		const math = nodeAccentColor('math.remap', 'category');
		expect(vector).not.toBe(noise);
		expect(noise).not.toBe(math);
		expect(vector).toBe('hsl(220 42% 30%)');
		expect(noise).toBe('hsl(270 38% 30%)');
	});

	it('keys contract mode on swapFamily', () => {
		const add = getPrimitive('math.add')!;
		const mul = getPrimitive('math.multiply')!;
		const uv = getPrimitive('procedural.uv')!;
		expect(nodeAccentColor(add, 'contract')).toBe(nodeAccentColor(mul, 'contract'));
		expect(nodeAccentColor(add, 'contract')).not.toBe(nodeAccentColor(uv, 'contract'));
	});

	it('returns null for unknown primitive ids', () => {
		expect(nodeAccentColor('nonexistent.primitive', 'category')).toBeNull();
	});
});
