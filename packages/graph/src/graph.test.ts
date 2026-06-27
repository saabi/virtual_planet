import { describe, expect, it } from 'vitest';
import type { CoordinateSpace, DataType, GraphDocument } from './types.js';
import { validateGraph } from './validate.js';
import { deserializeGraph, serializeGraph } from './serialize.js';

function twoNodeGraph(opts?: {
	toType?: DataType;
	fromSpace?: CoordinateSpace;
	toSpace?: CoordinateSpace;
}): GraphDocument {
	return {
		version: '1',
		nodes: [
			{
				id: 'n_noise',
				primitive: 'noise.perlin3d',
				inputs: [{ id: 'position', name: 'position', direction: 'in', dataType: 'vec3f', space: 'body_dir' }],
				outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32', space: opts?.fromSpace ?? 'none' }],
			},
			{
				id: 'n_remap',
				primitive: 'math.remap',
				inputs: [{ id: 'x', name: 'x', direction: 'in', dataType: opts?.toType ?? 'f32', space: opts?.toSpace ?? 'none' }],
				outputs: [{ id: 'out', name: 'out', direction: 'out', dataType: 'f32' }],
			},
		],
		edges: [{ id: 'e1', from: { node: 'n_noise', port: 'value' }, to: { node: 'n_remap', port: 'x' } }],
		outputs: [{ name: 'height', from: { node: 'n_remap', port: 'out' } }],
		consumers: [{ type: 'terrain-mesh', outputs: ['height'] }],
	};
}

function resourceGraph(toType: DataType): GraphDocument {
	return {
		version: '1',
		nodes: [
			{
				id: 'n_image',
				primitive: 'resource.image',
				inputs: [],
				outputs: [{ id: 'resource', name: 'resource', direction: 'out', dataType: 'image' }],
			},
			{
				id: 'n_sample',
				primitive: 'image.sample',
				inputs: [{ id: 'resource', name: 'resource', direction: 'in', dataType: toType }],
				outputs: [{ id: 'color', name: 'color', direction: 'out', dataType: 'vec4f' }],
			},
		],
		edges: [{ id: 'e_resource', from: { node: 'n_image', port: 'resource' }, to: { node: 'n_sample', port: 'resource' } }],
		outputs: [{ name: 'color', from: { node: 'n_sample', port: 'color' } }],
		consumers: [{ type: 'preview', outputs: ['color'] }],
		resources: [
			{ id: 'heightmap', type: 'image' },
			{ id: 'surface', type: 'mesh' },
			{ id: 'music', type: 'audio' },
		],
	};
}

describe('@virtual-planet/graph IR', () => {
	it('round-trips through serialize/deserialize', () => {
		const doc = twoNodeGraph();
		expect(deserializeGraph(serializeGraph(doc))).toEqual(doc);
	});

	it('serialization is deterministic', () => {
		expect(serializeGraph(twoNodeGraph())).toBe(serializeGraph(twoNodeGraph()));
	});

	it('accepts a type- and space-matching edge', () => {
		expect(validateGraph(twoNodeGraph()).ok).toBe(true);
	});

	it('rejects a type-mismatched edge', () => {
		const res = validateGraph(twoNodeGraph({ toType: 'vec3f' }));
		expect(res.ok).toBe(false);
		expect(res.issues.some((i) => i.kind === 'type-mismatch')).toBe(true);
	});

	it('accepts vec2f to vec3f promotion on an edge', () => {
		const doc: GraphDocument = {
			version: '1',
			nodes: [
				{
					id: 'n_uv',
					primitive: 'procedural.uv',
					inputs: [],
					outputs: [{ id: 'uv', name: 'uv', direction: 'out', dataType: 'vec2f', space: 'none' }]
				},
				{
					id: 'n_perlin',
					primitive: 'noise.perlin3d',
					inputs: [
						{ id: 'position', name: 'position', direction: 'in', dataType: 'vec3f', space: 'none' }
					],
					outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32', space: 'none' }]
				}
			],
			edges: [
				{ id: 'e_uv_perlin', from: { node: 'n_uv', port: 'uv' }, to: { node: 'n_perlin', port: 'position' } }
			],
			outputs: [],
			consumers: []
		};
		expect(validateGraph(doc).ok).toBe(true);
	});

	it('rejects a coordinate-space-mismatched edge', () => {
		const res = validateGraph(twoNodeGraph({ fromSpace: 'world_dir', toSpace: 'body_dir' }));
		expect(res.ok).toBe(false);
		expect(res.issues.some((i) => i.kind === 'space-mismatch')).toBe(true);
	});

	it('accepts matching resource ports', () => {
		expect(validateGraph(resourceGraph('image')).ok).toBe(true);
	});

	it('rejects mismatched resource ports', () => {
		const res = validateGraph(resourceGraph('mesh'));
		expect(res.ok).toBe(false);
		expect(res.issues).toContainEqual({
			kind: 'type-mismatch',
			edge: 'e_resource',
			from: 'image',
			to: 'mesh',
		});
	});

	it('round-trips resource dependencies through serialization', () => {
		const doc = resourceGraph('image');
		expect(deserializeGraph(serializeGraph(doc))).toEqual(doc);
	});
});
