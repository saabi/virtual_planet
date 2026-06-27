import { describe, expect, it } from 'vitest';
import { PROCEDURAL_WGSL_PACKAGE } from './index.js';

describe('@virtual-planet/procedural-wgsl scaffold', () => {
	it('exports its package identity', () => {
		expect(PROCEDURAL_WGSL_PACKAGE).toBe('@virtual-planet/procedural-wgsl');
	});
});
