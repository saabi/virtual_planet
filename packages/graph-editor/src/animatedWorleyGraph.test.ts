import '@virtual-planet/graph';
import { describe, expect, it } from 'vitest';
import { effectiveGraphDocument, validateGraph, validateGraphFull } from '@virtual-planet/graph';

import { animatedWorleyPipelineGraph } from './graphBuilders.js';

describe('animatedWorleyPipelineGraph', () => {
	it('wires the author Worley pipeline with scaled fragCoord and iTime offset', () => {
		const graph = animatedWorleyPipelineGraph();
		expect(validateGraph(graph).ok).toBe(true);
		expect(validateGraphFull(graph).ok).toBe(true);
		expect(graph.nodes.map((node) => node.primitive)).toEqual([
			'geometry.plane',
			'buffer.persist',
			'stage.vertex',
			'stage.fragment',
			'target.display',
			'host.fragCoord',
			'vector.vec4f',
			'constant.f32',
			'noise.worley2d',
			'constant.f32',
			'vector.mulScalar.vec2f',
			'host.iTime',
			'vector.vec2f',
			'vector.add.vec2f'
		]);

		expect(graph.edges.find((edge) => edge.id === 'e_mul_add_a')?.from).toEqual({
			node: 'n_vector_mulScalar_vec2f_6',
			port: 'value'
		});
		expect(graph.edges.find((edge) => edge.id === 'e_add_worley')?.to).toEqual({
			node: 'n_noise_worley2d_4',
			port: 'position'
		});
		expect(graph.edges.find((edge) => edge.id === 'e_fragment_display')?.to).toEqual({
			node: 'n_display',
			port: 'color'
		});
		expect(graph.nodes.find((node) => node.id === 'n_constant_f32_5')?.params).toEqual({
			value: 0.01
		});
	});

	it('derives an image consumer from the fragment → display chain', () => {
		const effective = effectiveGraphDocument(animatedWorleyPipelineGraph());
		expect(
			effective.outputs.some(
				(output) =>
					output.from.node === 'n_vector_vec4f_2' && output.from.port === 'value'
			)
		).toBe(true);
		expect(effective.consumers.some((consumer) => consumer.type === 'image')).toBe(true);
	});
});
