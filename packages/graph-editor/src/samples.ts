import type { GraphDocument } from '@virtual-planet/graph';

import { cosinePaletteEffectGraph, defaultPreviewGraph } from './graphBuilders.js';

export interface GraphSample {
	id: string;
	label: string;
	build(): GraphDocument;
}

/** Named example graphs loadable into the editor canvas. */
export const GRAPH_SAMPLES: readonly GraphSample[] = [
	{
		id: 'default-scalar',
		label: 'Noise field (scalar)',
		build: defaultPreviewGraph
	},
	{
		id: 'shadertoy-cosine-palette',
		label: 'ShaderToy — Cosine palette',
		build: cosinePaletteEffectGraph
	}
];

export function getGraphSample(id: string): GraphSample | undefined {
	return GRAPH_SAMPLES.find((sample) => sample.id === id);
}
