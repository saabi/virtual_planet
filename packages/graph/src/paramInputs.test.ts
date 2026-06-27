import { describe, expect, it } from 'vitest';
import { Type } from '@virtual-planet/schema';
import { getPrimitive, registerPrimitive } from './registry.js';
import './primitives/index.js'; // register the standard library (math.remap, …)
import { paramInputPorts, promotableParams, resolveParamBindings, X_CONST } from './paramInputs.js';
import type { Edge, Node } from './types.js';

// A primitive with a promotable scalar param AND an x-const (form-only) param.
registerPrimitive({
	id: 'test.octaveNoise',
	category: 'test',
	inputs: [{ name: 'p', dataType: 'vec3f' }],
	outputs: [{ name: 'value', dataType: 'f32' }],
	params: Type.Object({
		scale: Type.Number({ default: 0.5 }),
		octaves: Type.Integer({ default: 4, [X_CONST]: true } as Record<string, unknown>),
	}),
	wgsl: { moduleId: 'test.octaveNoise', entry: 'octaveNoise' },
});

describe('@virtual-planet/graph params-as-inputs', () => {
	it("promotes math.remap's four bounds", () => {
		const remap = getPrimitive('math.remap')!;
		expect(promotableParams(remap).sort()).toEqual(['inMax', 'inMin', 'outMax', 'outMin']);
	});

	it('excludes x-const params from promotion', () => {
		const p = getPrimitive('test.octaveNoise')!;
		expect(promotableParams(p)).toEqual(['scale']); // octaves is x-const → form-only
	});

	it('generates an input port per promotable param', () => {
		const ports = paramInputPorts(getPrimitive('math.remap')!);
		expect(ports.map((p) => p.name).sort()).toEqual(['inMax', 'inMin', 'outMax', 'outMin']);
		expect(ports.every((p) => p.dataType === 'f32')).toBe(true);
	});

	it('resolves precedence: edge > literal > default', () => {
		const remap = getPrimitive('math.remap')!;
		const node: Node = {
			id: 'n',
			primitive: 'math.remap',
			inputs: [{ id: 'x', name: 'x', direction: 'in', dataType: 'f32' }],
			outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32' }],
			params: { inMin: 0.1 }, // stored literal for inMin
		};
		const edges: Edge[] = [
			{ id: 'e', from: { node: 'src', port: 'value' }, to: { node: 'n', port: 'inMax' } }, // edge drives inMax
		];
		const b = resolveParamBindings(node, remap, edges);
		expect(b.inMax).toEqual({ kind: 'edge', from: { node: 'src', port: 'value' } });
		expect(b.inMin).toEqual({ kind: 'literal', value: 0.1 });
		// outMin/outMax fall back to schema default (literal)
		expect(b.outMin!.kind).toBe('literal');
	});
});
