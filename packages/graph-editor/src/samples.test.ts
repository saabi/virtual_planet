import '@virtual-planet/graph';
import { describe, expect, it } from 'vitest';
import { validateGraph } from '@virtual-planet/graph';

import { defaultPreviewGraph } from './graphBuilders.js';
import { inferPreviewBackend } from './previewBackend.js';
import { getGraphSample, GRAPH_SAMPLES } from './samples.js';

describe('graph-editor samples registry', () => {
	it('contains the cosine-palette sample and default scalar sample', () => {
		expect(GRAPH_SAMPLES.length).toBeGreaterThanOrEqual(2);
		expect(getGraphSample('shadertoy-cosine-palette')?.label).toContain('Cosine palette');
		expect(getGraphSample('default-scalar')?.label).toContain('scalar');
	});

	it('builds a valid fragment-image graph for the ShaderToy sample', () => {
		const sample = getGraphSample('shadertoy-cosine-palette');
		expect(sample).toBeDefined();
		const graph = sample!.build();
		expect(validateGraph(graph).ok).toBe(true);
		expect(graph.nodes.map((node) => node.primitive)).toEqual(
			expect.arrayContaining([
				'geometry.plane',
				'buffer.persist',
				'stage.vertex',
				'stage.fragment',
				'target.display',
				'effect.cosinePalette'
			])
		);
		expect(graph.edges.find((edge) => edge.id === 'e_plane_persist')?.from).toEqual({
			node: 'n_plane',
			port: 'mesh'
		});
		expect(graph.edges.find((edge) => edge.id === 'e_persist_vertex')?.to).toEqual({
			node: 'n_vertex',
			port: 'mesh'
		});
		expect(graph.edges.find((edge) => edge.id === 'e_effect_fragment')?.from).toEqual({
			node: 'n_effect',
			port: 'color'
		});
		expect(graph.nodes.find((node) => node.id === 'n_plane')?.params).toEqual({
			resU: 2,
			resV: 2
		});
		expect(graph.consumers[0]?.stage).toBe('fragment');
		expect(graph.outputs[0]?.name).toBe('image');
	});

	it('builds a valid scalar graph for the default sample', () => {
		const graph = getGraphSample('default-scalar')!.build();
		expect(validateGraph(graph).ok).toBe(true);
		expect(graph.consumers[0]?.stage).toBeUndefined();
	});
});

describe('inferPreviewBackend', () => {
	it('picks effect for a fragment vec4 image consumer', () => {
		const graph = getGraphSample('shadertoy-cosine-palette')!.build();
		expect(inferPreviewBackend(graph)).toBe('effect');
	});

	it('picks CPU scalar for the noise→remap default', () => {
		expect(inferPreviewBackend(defaultPreviewGraph())).toBe('cpu');
	});
});
