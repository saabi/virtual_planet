import { describe, expect, it } from 'vitest';
import '@virtual-planet/graph';
import { validateGraph } from '@virtual-planet/graph';
import { defaultPreviewGraph } from './defaultGraph.js';
import { applyPrimitiveSource } from './primitiveEditor.js';
import { NOISE_PERLIN3D_SOURCE } from './fixtures/perlin3d.source.js';
import { resetPrimitiveSources } from './primitiveSources.js';

describe('@virtual-planet/graph-editor default graph validation', () => {
	it('validates the default preview graph', () => {
		expect(validateGraph(defaultPreviewGraph()).ok).toBe(true);
	});

	it('stays valid after saving the canonical perlin fixture', () => {
		resetPrimitiveSources();
		const result = applyPrimitiveSource(defaultPreviewGraph(), 'noise.perlin3d', NOISE_PERLIN3D_SOURCE);
		expect(validateGraph(result.graph).ok).toBe(true);
	});
});
