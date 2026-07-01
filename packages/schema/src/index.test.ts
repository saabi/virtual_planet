import { describe, expect, it } from 'vitest';
import { SCHEMA_PACKAGE } from './index.js';

describe('@world-lab/schema scaffold', () => {
	it('exports its package identity', () => {
		expect(SCHEMA_PACKAGE).toBe('@world-lab/schema');
	});
});
