import { describe, expect, it } from 'vitest';
import { RUNTIME_CPU_PACKAGE } from './index.js';

describe('@virtual-planet/runtime-cpu scaffold', () => {
	it('exports its package identity', () => {
		expect(RUNTIME_CPU_PACKAGE).toBe('@virtual-planet/runtime-cpu');
	});
});
