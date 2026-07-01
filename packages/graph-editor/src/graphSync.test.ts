import { describe, expect, it } from 'vitest';
import { repairStalePortRefs, resyncGraphPortMetadata } from './graphSync.js';
import { defaultPreviewGraph } from './defaultGraph.js';

describe('@world-lab/graph-editor graphSync', () => {
	it('repairs a single-output edge after the port name changes on the node', () => {
		const doc = defaultPreviewGraph();
		const perlin = doc.nodes.find((node) => node.id === 'n_perlin')!;
		const renamed = {
			...doc,
			nodes: doc.nodes.map((node) =>
				node.id === 'n_perlin'
					? {
							...node,
							outputs: [{ ...perlin.outputs[0]!, id: 'noise', name: 'noise' }]
						}
					: node
			)
		};

		const repaired = repairStalePortRefs(renamed);
		expect(repaired.edges.find((edge) => edge.id === 'e_perlin_remap')?.from.port).toBe('noise');
	});
});
