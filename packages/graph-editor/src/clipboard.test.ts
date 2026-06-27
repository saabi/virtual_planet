import { describe, expect, it, beforeEach } from 'vitest';
import '@virtual-planet/graph';
import { applyEditIntent, resetIdCounters } from './irAdapter.js';
import { copyNodeToClipboard, pasteOffsetPosition } from './clipboard.js';

describe('@virtual-planet/graph-editor clipboard', () => {
	beforeEach(() => {
		resetIdCounters();
	});

	it('copyNodeToClipboard captures primitive and params', () => {
		let doc = applyEditIntent(
			{ version: '1', nodes: [], edges: [], outputs: [], consumers: [] },
			{ kind: 'add-node', primitiveId: 'math.remap', position: { x: 0, y: 0 } }
		);
		doc = applyEditIntent(doc, {
			kind: 'set-params',
			nodeId: doc.nodes[0]!.id,
			params: { inMin: -2, inMax: 2, outMin: 0, outMax: 1 }
		});

		expect(copyNodeToClipboard(doc, doc.nodes[0]!.id)).toEqual({
			primitiveId: 'math.remap',
			params: { inMin: -2, inMax: 2, outMin: 0, outMax: 1 }
		});
	});

	it('duplicate-node preserves params with a new id', () => {
		let doc = applyEditIntent(
			{ version: '1', nodes: [], edges: [], outputs: [], consumers: [] },
			{ kind: 'add-node', primitiveId: 'math.remap', position: { x: 10, y: 20 } }
		);
		const sourceId = doc.nodes[0]!.id;
		doc = applyEditIntent(doc, {
			kind: 'set-params',
			nodeId: sourceId,
			params: { inMin: -1, inMax: 1, outMin: 0, outMax: 1 }
		});

		doc = applyEditIntent(doc, {
			kind: 'duplicate-node',
			sourceNodeId: sourceId,
			position: pasteOffsetPosition({ x: 10, y: 20 })
		});

		expect(doc.nodes).toHaveLength(2);
		expect(doc.nodes[1]?.id).not.toBe(sourceId);
		expect(doc.nodes[1]?.params).toEqual(doc.nodes[0]?.params);
		expect(doc.edges).toHaveLength(0);
	});
});
