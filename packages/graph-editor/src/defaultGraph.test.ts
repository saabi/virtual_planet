import { describe, expect, it } from 'vitest';
import '@virtual-planet/graph';
import { getPrimitive, validateGraph } from '@virtual-planet/graph';
import { defaultPreviewGraph } from './defaultGraph.js';
import { applyPrimitiveSource } from './primitiveEditor.js';
import { NOISE_PERLIN3D_SOURCE } from './fixtures/perlin3d.source.js';
import { cloneBuiltinPrimitive, resetPrimitiveSources } from './primitiveSources.js';
import { resetUserPrimitives } from './userPrimitives.js';

const TEST_USER_PERLIN = 'user.test-default-graph-perlin';

describe('@virtual-planet/graph-editor default graph validation', () => {
	it('validates the default preview graph', () => {
		expect(validateGraph(defaultPreviewGraph()).ok).toBe(true);
	});

	it('stays valid after saving a cloned user perlin fixture', () => {
		resetPrimitiveSources();
		resetUserPrimitives();
		if (!getPrimitive(TEST_USER_PERLIN)) {
			cloneBuiltinPrimitive('noise.perlin3d', TEST_USER_PERLIN);
		}
		const source = NOISE_PERLIN3D_SOURCE.replace('id: noise.perlin3d', `id: ${TEST_USER_PERLIN}`);
		const result = applyPrimitiveSource(defaultPreviewGraph(), TEST_USER_PERLIN, source);
		expect(validateGraph(result.graph).ok).toBe(true);
	});
});
