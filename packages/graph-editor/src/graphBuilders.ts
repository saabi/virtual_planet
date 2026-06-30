import '@virtual-planet/graph';
import {
	getPrimitive,
	pipelineFieldOutput,
	type GraphDocument,
	type Node,
	type Port,
	type PortRef,
	type PortSpec
} from '@virtual-planet/graph';

function instantiatePorts(specs: readonly PortSpec[], direction: 'in' | 'out'): Port[] {
	return specs.map((spec) => ({
		id: spec.name,
		name: spec.name,
		direction,
		dataType: spec.dataType,
		space: spec.space ?? 'none'
	}));
}

function snapshotNode(
	id: string,
	primitiveId: string,
	position: { x: number; y: number },
	params?: Record<string, unknown>
): Node {
	const primitive = getPrimitive(primitiveId);
	if (!primitive) {
		throw new Error(`Unknown primitive: ${primitiveId}`);
	}
	return {
		id,
		primitive: primitiveId,
		position,
		inputs: instantiatePorts(primitive.inputs, 'in'),
		outputs: instantiatePorts(primitive.outputs, 'out'),
		...(params !== undefined ? { params } : {})
	};
}

function portRef(nodeId: string, primitiveId: string, direction: 'in' | 'out', index: number): PortRef {
	const primitive = getPrimitive(primitiveId);
	if (!primitive) {
		throw new Error(`Unknown primitive: ${primitiveId}`);
	}
	const ports = direction === 'in' ? primitive.inputs : primitive.outputs;
	const port = ports[index];
	if (!port) {
		throw new Error(`Missing ${direction} port ${index} on ${primitiveId}`);
	}
	return { node: nodeId, port: port.name };
}

/** ShaderToy-style pipeline: scaled fragCoord + iTime → Worley → vec4 fragment color. */
export function animatedWorleyPipelineGraph(): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_plane', 'geometry.plane', { x: 49.24, y: -44.89 }, { resU: 2, resV: 2 }),
			snapshotNode('n_persist', 'buffer.persist', { x: 261.07, y: -46.62 }),
			snapshotNode('n_vertex', 'stage.vertex', { x: 634, y: 19.35 }),
			snapshotNode('n_fragment', 'stage.fragment', { x: 840.28, y: 85.54 }),
			snapshotNode('n_display', 'target.display', { x: 1034.73, y: 113.82 }),
			snapshotNode('n_frag', 'host.fragCoord', { x: -207.46, y: 23.94 }),
			snapshotNode('n_vector_vec4f_2', 'vector.vec4f', { x: 632.67, y: 98.23 }),
			snapshotNode('n_constant_f32_1', 'constant.f32', { x: 431.65, y: 172.5 }, { value: 1 }),
			snapshotNode('n_noise_worley2d_4', 'noise.worley2d', { x: 432.78, y: 85.81 }),
			snapshotNode('n_constant_f32_5', 'constant.f32', { x: -207.78, y: 91.47 }, { value: 0.01 }),
			snapshotNode('n_vector_mulScalar_vec2f_6', 'vector.mulScalar.vec2f', { x: 32.68, y: 24.76 }),
			snapshotNode('n_host_iTime_7', 'host.iTime', { x: -198.51, y: 169.09 }),
			snapshotNode('n_vector_vec2f_8', 'vector.vec2f', { x: 30.24, y: 122.01 }),
			snapshotNode('n_vector_add_vec2f_1', 'vector.add.vec2f', { x: 233.17, y: 76.9 })
		],
		edges: [
			{
				id: 'e_plane_persist',
				from: portRef('n_plane', 'geometry.plane', 'out', 0),
				to: portRef('n_persist', 'buffer.persist', 'in', 0)
			},
			{
				id: 'e_persist_vertex',
				from: portRef('n_persist', 'buffer.persist', 'out', 0),
				to: portRef('n_vertex', 'stage.vertex', 'in', 0)
			},
			{
				id: 'e_vertex_fragment',
				from: portRef('n_vertex', 'stage.vertex', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 0)
			},
			{
				id: 'e_frag_mul',
				from: portRef('n_frag', 'host.fragCoord', 'out', 0),
				to: portRef('n_vector_mulScalar_vec2f_6', 'vector.mulScalar.vec2f', 'in', 0)
			},
			{
				id: 'e_scale_mul',
				from: portRef('n_constant_f32_5', 'constant.f32', 'out', 0),
				to: portRef('n_vector_mulScalar_vec2f_6', 'vector.mulScalar.vec2f', 'in', 1)
			},
			{
				id: 'e_time_vec2_x',
				from: portRef('n_host_iTime_7', 'host.iTime', 'out', 0),
				to: portRef('n_vector_vec2f_8', 'vector.vec2f', 'in', 0)
			},
			{
				id: 'e_time_vec2_y',
				from: portRef('n_host_iTime_7', 'host.iTime', 'out', 0),
				to: portRef('n_vector_vec2f_8', 'vector.vec2f', 'in', 1)
			},
			{
				id: 'e_mul_add_a',
				from: portRef('n_vector_mulScalar_vec2f_6', 'vector.mulScalar.vec2f', 'out', 0),
				to: portRef('n_vector_add_vec2f_1', 'vector.add.vec2f', 'in', 0)
			},
			{
				id: 'e_vec2_add_b',
				from: portRef('n_vector_vec2f_8', 'vector.vec2f', 'out', 0),
				to: portRef('n_vector_add_vec2f_1', 'vector.add.vec2f', 'in', 1)
			},
			{
				id: 'e_add_worley',
				from: portRef('n_vector_add_vec2f_1', 'vector.add.vec2f', 'out', 0),
				to: portRef('n_noise_worley2d_4', 'noise.worley2d', 'in', 0)
			},
			{
				id: 'e_worley_vec4_x',
				from: portRef('n_noise_worley2d_4', 'noise.worley2d', 'out', 0),
				to: portRef('n_vector_vec4f_2', 'vector.vec4f', 'in', 0)
			},
			{
				id: 'e_worley_vec4_y',
				from: portRef('n_noise_worley2d_4', 'noise.worley2d', 'out', 0),
				to: portRef('n_vector_vec4f_2', 'vector.vec4f', 'in', 1)
			},
			{
				id: 'e_alpha_vec4_w',
				from: portRef('n_constant_f32_1', 'constant.f32', 'out', 0),
				to: portRef('n_vector_vec4f_2', 'vector.vec4f', 'in', 3)
			},
			{
				id: 'e_vec4_fragment',
				from: portRef('n_vector_vec4f_2', 'vector.vec4f', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 1)
			},
			{
				id: 'e_fragment_display',
				from: portRef('n_fragment', 'stage.fragment', 'out', 0),
				to: portRef('n_display', 'target.display', 'in', 0)
			}
		],
		outputs: [],
		consumers: []
	};
}

/** Default uv → perlin → remap preview graph using live primitive port names. */
export function defaultPreviewGraph(): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_uv', 'procedural.uv', { x: 0, y: 80 }),
			snapshotNode('n_perlin', 'noise.perlin3d', { x: 220, y: 60 }),
			snapshotNode('n_remap', 'math.remap', { x: 460, y: 80 }, {
				inMin: -1,
				inMax: 1,
				outMin: 0,
				outMax: 1
			})
		],
		edges: [
			{
				id: 'e_uv_perlin',
				from: portRef('n_uv', 'procedural.uv', 'out', 0),
				to: portRef('n_perlin', 'noise.perlin3d', 'in', 0)
			},
			{
				id: 'e_perlin_remap',
				from: portRef('n_perlin', 'noise.perlin3d', 'out', 0),
				to: portRef('n_remap', 'math.remap', 'in', 0)
			}
		],
		outputs: [{ name: 'field', from: portRef('n_remap', 'math.remap', 'out', 0) }],
		consumers: [{ type: 'preview', outputs: ['field'] }]
	};
}

/** ShaderToy S0: explicit pipeline nodes with the cosine palette as the fragment field. */
export function cosinePaletteEffectGraph(): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_plane', 'geometry.plane', { x: 0, y: 40 }, { resU: 2, resV: 2 }),
			snapshotNode('n_persist', 'buffer.persist', { x: 240, y: 40 }),
			snapshotNode('n_vertex', 'stage.vertex', { x: 480, y: 40 }),
			snapshotNode('n_fragment', 'stage.fragment', { x: 740, y: 160 }),
			snapshotNode('n_display', 'target.display', { x: 1000, y: 160 }),
			snapshotNode('n_frag', 'host.fragCoord', { x: 220, y: 280 }),
			snapshotNode('n_res', 'host.iResolution', { x: 220, y: 400 }),
			snapshotNode('n_time', 'host.iTime', { x: 220, y: 520 }),
			snapshotNode('n_effect', 'effect.cosinePalette', { x: 500, y: 400 })
		],
		edges: [
			{
				id: 'e_plane_persist',
				from: portRef('n_plane', 'geometry.plane', 'out', 0),
				to: portRef('n_persist', 'buffer.persist', 'in', 0)
			},
			{
				id: 'e_persist_vertex',
				from: portRef('n_persist', 'buffer.persist', 'out', 0),
				to: portRef('n_vertex', 'stage.vertex', 'in', 0)
			},
			{
				id: 'e_vertex_fragment',
				from: portRef('n_vertex', 'stage.vertex', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 0)
			},
			{
				id: 'e_frag_effect',
				from: portRef('n_frag', 'host.fragCoord', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 0)
			},
			{
				id: 'e_res_effect',
				from: portRef('n_res', 'host.iResolution', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 1)
			},
			{
				id: 'e_time_effect',
				from: portRef('n_time', 'host.iTime', 'out', 0),
				to: portRef('n_effect', 'effect.cosinePalette', 'in', 2)
			},
			{
				id: 'e_effect_fragment',
				from: portRef('n_effect', 'effect.cosinePalette', 'out', 0),
				to: portRef('n_fragment', 'stage.fragment', 'in', 1)
			},
			{
				id: 'e_fragment_display',
				from: portRef('n_fragment', 'stage.fragment', 'out', 0),
				to: portRef('n_display', 'target.display', 'in', 0)
			}
		],
		outputs: [{ name: 'image', from: portRef('n_effect', 'effect.cosinePalette', 'out', 0) }],
		consumers: [{ type: 'image', id: 'image', stage: 'fragment', outputs: ['image'] }]
	};
}

export function primaryPreviewOutput(doc: GraphDocument): PortRef | null {
	return doc.outputs[0]?.from ?? pipelineFieldOutput(doc);
}

export function outputPortDataType(doc: GraphDocument, output: PortRef): string | null {
	const node = doc.nodes.find((candidate) => candidate.id === output.node);
	if (!node) return null;
	const port = node.outputs.find(
		(candidate) => candidate.id === output.port || candidate.name === output.port
	);
	return port?.dataType ?? null;
}
