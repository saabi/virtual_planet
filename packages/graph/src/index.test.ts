import { describe, expect, it } from 'vitest';
import { GRAPH_PACKAGE } from './index.js';

describe('@virtual-planet/graph scaffold', () => {
	it('exports its package identity', () => {
		expect(GRAPH_PACKAGE).toBe('@virtual-planet/graph');
	});
});
