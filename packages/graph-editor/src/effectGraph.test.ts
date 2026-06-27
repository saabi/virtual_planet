import { describe, expect, it } from 'vitest';
import { cosinePaletteEffectGraph, cosinePaletteEffectOutput } from './effectGraph.js';

describe('cosinePaletteEffectGraph', () => {
	it('wires host inputs to effect.cosinePalette with fragment consumer', () => {
		const graph = cosinePaletteEffectGraph();
		expect(graph.nodes).toHaveLength(4);
		expect(graph.outputs[0]?.name).toBe('image');
		expect(graph.consumers[0]?.stage).toBe('fragment');
		const output = cosinePaletteEffectOutput();
		expect(output.node).toBe('n_effect');
		expect(output.port).toBe('color');
	});
});
