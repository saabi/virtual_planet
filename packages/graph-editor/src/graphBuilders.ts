import '@virtual-planet/graph';
import {
	getPrimitive,
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

/** ShaderToy S0: host inputs → cosine palette → fragment consumer. */
export function cosinePaletteEffectGraph(): GraphDocument {
	return {
		version: '1',
		nodes: [
			snapshotNode('n_frag', 'host.fragCoord', { x: 0, y: 100 }),
			snapshotNode('n_res', 'host.iResolution', { x: 0, y: 220 }),
			snapshotNode('n_time', 'host.iTime', { x: 0, y: 340 }),
			snapshotNode('n_effect', 'effect.cosinePalette', { x: 280, y: 180 })
		],
		edges: [
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
			}
		],
		outputs: [{ name: 'image', from: portRef('n_effect', 'effect.cosinePalette', 'out', 0) }],
		consumers: [{ type: 'image', id: 'image', stage: 'fragment', outputs: ['image'] }]
	};
}

export function primaryPreviewOutput(doc: GraphDocument): PortRef | null {
	return doc.outputs[0]?.from ?? null;
}

export function outputPortDataType(doc: GraphDocument, output: PortRef): string | null {
	const node = doc.nodes.find((candidate) => candidate.id === output.node);
	if (!node) return null;
	const port = node.outputs.find(
		(candidate) => candidate.id === output.port || candidate.name === output.port
	);
	return port?.dataType ?? null;
}
