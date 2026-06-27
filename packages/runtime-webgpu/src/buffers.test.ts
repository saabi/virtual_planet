import { describe, expect, it } from 'vitest';
import { alignTo, rgba8BufferByteLength } from './buffers.js';

describe('@virtual-planet/runtime-webgpu buffers', () => {
	it('aligns sizes to WebGPU buffer alignment', () => {
		expect(alignTo(0, 256)).toBe(0);
		expect(alignTo(1, 4)).toBe(4);
		expect(alignTo(256, 256)).toBe(256);
		expect(alignTo(257, 256)).toBe(512);
	});

	it('computes RGBA8 byte length', () => {
		expect(rgba8BufferByteLength(64, 64)).toBe(64 * 64 * 4);
	});

	it('rejects invalid dimensions', () => {
		expect(() => rgba8BufferByteLength(0, 64)).toThrow(/positive/i);
		expect(() => alignTo(-1, 4)).toThrow(/non-negative/i);
	});
});
