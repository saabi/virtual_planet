import { describe, expect, it } from 'vitest';
import { GRAPH_EDITOR_PACKAGE } from './index.js';

describe('@world-lab/graph-editor scaffold', () => {
	it('exports its package identity', () => {
		expect(GRAPH_EDITOR_PACKAGE).toBe('@world-lab/graph-editor');
	});
});
