import { describe, expect, it } from 'vitest';
import { EFFECT_COSINE_PALETTE_SOURCE } from './cosinePalette.js';

describe('effect.cosinePalette WGSL module', () => {
	it('declares ShaderToy category and cosine_palette entry', () => {
		expect(EFFECT_COSINE_PALETTE_SOURCE).toContain('id: effect.cosinePalette');
		expect(EFFECT_COSINE_PALETTE_SOURCE).toContain('category: ShaderToy');
		expect(EFFECT_COSINE_PALETTE_SOURCE).toContain('fn cosine_palette(');
	});
});
