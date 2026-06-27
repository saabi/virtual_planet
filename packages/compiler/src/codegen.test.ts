import { describe, expect, it } from 'vitest';
import { registerPrimitive } from '@virtual-planet/graph';
import { Type } from '@virtual-planet/schema';
import type { GraphSlice } from './slice.js';
import { generateWgsl, type WgslModule, type WgslModuleResolver } from './codegen.js';

registerPrimitive({ id: 'test.a', category: 'test', inputs: [], outputs: [{ name: 'value', dataType: 'f32' }], params: Type.Object({}), wgsl: { moduleId: 'mod.a', entry: 'a' } });
registerPrimitive({ id: 'test.b', category: 'test', inputs: [], outputs: [{ name: 'value', dataType: 'f32' }], params: Type.Object({}), wgsl: { moduleId: 'mod.b', entry: 'b' } });

const modules: Record<string, WgslModule> = {
	'mod.util': { id: 'mod.util', source: 'fn util() -> f32 { return 1.0; }' },
	'mod.a': { id: 'mod.a', source: 'fn a() -> f32 { return util(); }', dependencies: ['mod.util'] },
	'mod.b': { id: 'mod.b', source: 'fn b() -> f32 { return 2.0; }' },
};
const resolver: WgslModuleResolver = { resolve: async (id) => modules[id] };

function sliceWith(primIds: string[]): GraphSlice {
	return {
		nodes: primIds.map((p, i) => ({
			id: `n${i}`,
			primitive: p,
			inputs: [],
			outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32' }],
		})),
		edges: [],
		outputs: [],
	};
}

describe('@virtual-planet/compiler generateWgsl', () => {
	it('emits only the modules the slice needs, dependencies first', async () => {
		const g = await generateWgsl(sliceWith(['test.a']), resolver);
		expect(g.moduleIds).toEqual(['mod.util', 'mod.a']);
		expect(g.moduleIds).not.toContain('mod.b');
		expect(g.code).toContain('fn a()');
		expect(g.code).toContain('fn util()');
		expect(g.code).not.toContain('fn b()');
	});

	it('deduplicates shared modules', async () => {
		const g = await generateWgsl(sliceWith(['test.a', 'test.a']), resolver);
		expect(g.moduleIds.filter((m) => m === 'mod.a')).toHaveLength(1);
		expect(g.moduleIds.filter((m) => m === 'mod.util')).toHaveLength(1);
	});

	it('throws if a node references an unregistered primitive', async () => {
		await expect(generateWgsl(sliceWith(['test.unknown']), resolver)).rejects.toThrow();
	});
});
