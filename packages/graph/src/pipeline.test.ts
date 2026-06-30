import { describe, expect, it } from 'vitest';

import { getPrimitive } from './registry.js';
import type { GraphDocument, Node, Port, PortRef } from './types.js';
import type { PortSpec } from './primitive.js';
import { isPipelineTarget, outputSinkNodeIds } from './pipeline.js';
import { validateGraphFull } from './validate.js';

import './primitives/index.js';

function instantiatePorts(specs: readonly PortSpec[], direction: 'in' | 'out'): Port[] {
	return specs.map((spec) => ({
		id: spec.name,
		name: spec.name,
		direction,
		dataType: spec.dataType,
		space: spec.space ?? 'none'
	}));
}

function snapshotNode(id: string, primitiveId: string, params?: Record<string, unknown>): Node {
	const primitive = getPrimitive(primitiveId);
	if (!primitive) {
		throw new Error(`Unknown primitive: ${primitiveId}`);
	}
	return {
		id,
		primitive: primitiveId,
		params,
		inputs: instantiatePorts(primitive.inputs, 'in'),
		outputs: instantiatePorts(primitive.outputs, 'out')
	};
}

function portRef(nodeId: string, primitiveId: string, direction: 'in' | 'out', index: number): PortRef {
	const primitive = getPrimitive(primitiveId);
	if (!primitive) {
		throw new Error(`Unknown primitive: ${primitiveId}`);
	}
	const ports = direction === 'in' ? primitive.inputs : primitive.outputs;
	const port = ports[index];
	if (!port) {
		throw new Error(`Missing ${direction} port ${index} on ${primitiveId}`);
	}
	return { node: nodeId, port: port.name };
}

function s0PipelineGraph(): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_plane', 'geometry.fullscreenPlane'),
			snapshotNode('n_persist', 'buffer.persist'),
			snapshotNode('n_vertex', 'stage.vertex'),
			snapshotNode('n_fragment', 'stage.fragment'),
			snapshotNode('n_display', 'target.display'),
			snapshotNode('n_frag', 'host.fragCoord'),
			snapshotNode('n_res', 'host.iResolution'),
			snapshotNode('n_time', 'host.iTime'),
			snapshotNode('n_effect', 'effect.cosinePalette')
		],
		edges: [
			{
				id: 'e_plane_persist',
				from: portRef('n_plane', 'geometry.fullscreenPlane', 'out', 0),
				to: portRef('n_persist', 'buffer.persist', 'in', 0)
			},
			{
				id: 'e_persist_vertex',
				from: portRef('n_persist', 'buffer.persist', 'out', 0),
				to: portRef('n_vertex', 'stage.vertex', 'in', 0)
			},
			{
				id: 'e_vertex_fragment',
				from: portRef('n_vertex', 'stage.vertex', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 0)
			},
			{
				id: 'e_frag_effect',
				from: portRef('n_frag', 'host.fragCoord', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 0)
			},
			{
				id: 'e_res_effect',
				from: portRef('n_res', 'host.iResolution', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 1)
			},
			{
				id: 'e_time_effect',
				from: portRef('n_time', 'host.iTime', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 2)
			},
			{
				id: 'e_effect_fragment',
				from: portRef('n_effect', 'effect.cosinePalette', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 1)
			},
			{
				id: 'e_fragment_display',
				from: portRef('n_fragment', 'stage.fragment', 'out', 0),
				to: portRef('n_display', 'target.display', 'in', 0)
			}
		],
		outputs: [{ name: 'image', from: portRef('n_effect', 'effect.cosinePalette', 'out', 0) }],
		consumers: [{ type: 'image', id: 'image', stage: 'fragment', outputs: ['image'] }]
	};
}

describe('@virtual-planet/graph pipeline output reconciliation', () => {
	it('treats target.display as a pipeline render target', () => {
		const display = s0PipelineGraph().nodes.find((node) => node.primitive === 'target.display');
		expect(display).toBeDefined();
		expect(isPipelineTarget(display!)).toBe(true);
	});

	it('includes declared outputs and pipeline targets in outputSinkNodeIds', () => {
		expect(outputSinkNodeIds(s0PipelineGraph()).sort()).toEqual(['n_display', 'n_effect'].sort());
	});

	it('validates a wired pipeline with empty doc.outputs (no dangling-node spam)', () => {
		const graph: GraphDocument = {
			...s0PipelineGraph(),
			outputs: [],
			consumers: [{ type: 'image', id: 'image', stage: 'fragment', outputs: [] }]
		};
		const result = validateGraphFull(graph);
		expect(result.ok).toBe(true);
		expect(result.issues.some((issue) => issue.kind === 'dangling-node')).toBe(false);
		expect(result.issues.some((issue) => issue.kind === 'no-output-path')).toBe(false);
	});

	it('still reports exactly one no-output-path for a stale declared output ref', () => {
		const graph: GraphDocument = {
			...s0PipelineGraph(),
			outputs: [{ name: 'image', from: { node: 'missing_effect', port: 'color' } }]
		};
		const result = validateGraphFull(graph);
		expect(result.ok).toBe(false);
		const stale = result.issues.filter((issue) => issue.kind === 'no-output-path');
		expect(stale).toHaveLength(1);
		expect(stale[0]).toMatchObject({
			kind: 'no-output-path',
			output: 'image',
			node: 'missing_effect',
			port: 'color'
		});
		expect(result.issues.some((issue) => issue.kind === 'dangling-node')).toBe(false);
	});
});
