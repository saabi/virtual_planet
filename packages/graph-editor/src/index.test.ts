import { describe, expect, it } from 'vitest';
import { GRAPH_EDITOR_PACKAGE } from './index.js';

describe('@virtual-planet/graph-editor scaffold', () => {
	it('exports its package identity', () => {
		expect(GRAPH_EDITOR_PACKAGE).toBe('@virtual-planet/graph-editor');
	});
});
