import '@virtual-planet/graph';
import { describe, expect, it } from 'vitest';
import { getPrimitive, type GraphDocument, type Node, type Port, type PortRef, type PortSpec } from '@virtual-planet/graph';

import {
	geometryCacheFingerprint,
	PipelineGraphExecutor,
	planPipelineGraph
} from './pipelineGraph.js';

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

function pipelineGraph(params?: Record<string, unknown>): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_plane', 'geometry.fullscreenPlane', params),
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

describe('@virtual-planet/runtime-webgpu pipeline graph', () => {
	it('plans the S0 pipeline via the generic geometry source role', () => {
		expect(planPipelineGraph(pipelineGraph())).toEqual({
			geometryNode: 'n_plane',
			geometryPrimitive: 'geometry.fullscreenPlane',
			persistNode: 'n_persist',
			vertexStageNode: 'n_vertex',
			fragmentStageNode: 'n_fragment',
			displayTargetNode: 'n_display',
			fieldOutput: { node: 'n_effect', port: 'color' }
		});
	});

	it('realizes buffer.persist geometry only once across frames with the same fingerprint', () => {
		const executor = new PipelineGraphExecutor();
		const graph = pipelineGraph();
		const first = planPipelineGraph(graph);
		executor.cache.realizeGeometry(geometryCacheFingerprint(graph, first));
		const second = planPipelineGraph(graph);
		executor.cache.realizeGeometry(geometryCacheFingerprint(graph, second));
		expect(executor.cache.geometryRealizations).toBe(1);
	});

	it('re-realizes geometry when the upstream source fingerprint changes', () => {
		const executor = new PipelineGraphExecutor();
		const base = pipelineGraph();
		const changed = pipelineGraph({ segments: 4 });
		const basePlan = planPipelineGraph(base);
		const changedPlan = planPipelineGraph(changed);
		executor.cache.realizeGeometry(geometryCacheFingerprint(base, basePlan));
		executor.cache.realizeGeometry(geometryCacheFingerprint(changed, changedPlan));
		expect(executor.cache.geometryRealizations).toBe(2);
		expect(geometryCacheFingerprint(base, basePlan)).not.toBe(
			geometryCacheFingerprint(changed, changedPlan)
		);
	});
});
