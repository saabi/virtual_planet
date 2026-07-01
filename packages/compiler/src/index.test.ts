import { describe, expect, it } from 'vitest';
import { COMPILER_PACKAGE } from './index.js';

describe('@world-lab/compiler scaffold', () => {
	it('exports its package identity', () => {
		expect(COMPILER_PACKAGE).toBe('@world-lab/compiler');
	});
});
