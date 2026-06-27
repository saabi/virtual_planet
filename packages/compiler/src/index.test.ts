import { describe, expect, it } from 'vitest';
import { COMPILER_PACKAGE } from './index.js';

describe('@virtual-planet/compiler scaffold', () => {
	it('exports its package identity', () => {
		expect(COMPILER_PACKAGE).toBe('@virtual-planet/compiler');
	});
});
