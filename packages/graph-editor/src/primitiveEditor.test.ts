import { describe, expect, it, beforeEach } from 'vitest';
import { getPrimitive } from '@virtual-planet/graph';
import { defaultPreviewGraph } from './defaultGraph.js';
import { NOISE_PERLIN3D_SOURCE } from './fixtures/perlin3d.source.js';
import { applyPrimitiveSource } from './primitiveEditor.js';
import { cloneBuiltinPrimitive, getDefaultPrimitiveSource, resetPrimitiveSources } from './primitiveSources.js';
import { resetUserPrimitives } from './userPrimitives.js';

const TEST_USER_PERLIN = 'user.test-perlin-edit';

function ensureTestPerlinUser(): string {
	if (!getPrimitive(TEST_USER_PERLIN)) {
		cloneBuiltinPrimitive('noise.perlin3d', TEST_USER_PERLIN);
	}
	return TEST_USER_PERLIN;
}

function testPerlinSource(userId: string, mutate?: (source: string) => string): string {
	const source = NOISE_PERLIN3D_SOURCE.replace('id: noise.perlin3d', `id: ${userId}`);
	return mutate ? mutate(source) : source;
}

function perlinTestGraph() {
	const graph = defaultPreviewGraph();
	return {
		...graph,
		nodes: graph.nodes.map((node) =>
			node.id === 'n_perlin' ? { ...node, primitive: TEST_USER_PERLIN } : node
		)
	};
}

describe('@virtual-planet/graph-editor applyPrimitiveSource', () => {
	beforeEach(() => {
		resetPrimitiveSources();
		resetUserPrimitives();
		ensureTestPerlinUser();
	});

	it('rewires single-output edges when an output port is renamed in YAML', () => {
		const renamedSource = testPerlinSource(TEST_USER_PERLIN, (source) =>
			source.replace('outputs:\n  value:', 'outputs:\n  noise:')
		);
		const result = applyPrimitiveSource(perlinTestGraph(), TEST_USER_PERLIN, renamedSource);

		expect(result.validationIssues.some((issue) => issue.kind === 'unknown-port')).toBe(false);
		expect(result.graph.edges.find((edge) => edge.id === 'e_perlin_remap')?.from.port).toBe('noise');
	});

	it('ripples new params onto graph instances', () => {
		const result = applyPrimitiveSource(
			perlinTestGraph(),
			TEST_USER_PERLIN,
			testPerlinSource(TEST_USER_PERLIN)
		);
		const perlinNode = result.graph.nodes.find((node) => node.primitive === TEST_USER_PERLIN);

		expect(perlinNode?.params?.scale).toBe(0.002);
		expect(getPrimitive(TEST_USER_PERLIN)?.params).toEqual(result.loaded.primitive.params);
	});

	it('preserves evalCPU from the previous registration', () => {
		const evalCPU = getPrimitive(TEST_USER_PERLIN)?.evalCPU;
		expect(evalCPU).toBeDefined();

		applyPrimitiveSource(perlinTestGraph(), TEST_USER_PERLIN, testPerlinSource(TEST_USER_PERLIN));
		expect(getPrimitive(TEST_USER_PERLIN)?.evalCPU).toBe(evalCPU);
	});

	it('does not mutate unrelated primitives', () => {
		const remapBefore = getPrimitive('math.remap');
		applyPrimitiveSource(perlinTestGraph(), TEST_USER_PERLIN, testPerlinSource(TEST_USER_PERLIN));
		expect(getPrimitive('math.remap')).toBe(remapBefore);
	});

	it('throws when saving an unregistered primitive id', () => {
		expect(() =>
			applyPrimitiveSource(defaultPreviewGraph(), 'missing.primitive', NOISE_PERLIN3D_SOURCE)
		).toThrow(/not registered/i);
	});

	it('throws when attempting to save a built-in primitive', () => {
		expect(() =>
			applyPrimitiveSource(defaultPreviewGraph(), 'math.remap', getDefaultPrimitiveSource('math.remap'))
		).toThrow(/read-only/i);
	});

	it('throws when YAML id does not match moduleId', () => {
		const mismatched = testPerlinSource(TEST_USER_PERLIN, (source) =>
			source.replace(`id: ${TEST_USER_PERLIN}`, 'id: other.noise')
		);
		expect(() => applyPrimitiveSource(perlinTestGraph(), TEST_USER_PERLIN, mismatched)).toThrow(
			/id mismatch/i
		);
	});
});
