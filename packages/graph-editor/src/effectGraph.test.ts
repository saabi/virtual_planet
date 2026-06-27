import { describe, expect, it } from 'vitest';
import { cosinePaletteEffectGraph } from './graphBuilders.js';

describe('cosinePaletteEffectGraph', () => {
	it('wires host inputs to effect.cosinePalette with fragment consumer', () => {
		const graph = cosinePaletteEffectGraph();
		expect(graph.nodes).toHaveLength(4);
		expect(graph.outputs[0]?.name).toBe('image');
		expect(graph.consumers[0]?.stage).toBe('fragment');
		expect(graph.nodes.every((node) => node.position !== undefined)).toBe(true);
	});
});
