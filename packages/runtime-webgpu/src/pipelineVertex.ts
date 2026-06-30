import type { GraphDocument } from '@virtual-planet/graph';
import { planeGridVertexCount } from '@virtual-planet/graph';

import type { PipelineGraphPlan } from './pipelineGraph.js';

export { planeGridVertexCount };

/** Resolve resU/resV from the wired geometry source node. */
export function resolvePipelineGeometryResolution(
	doc: GraphDocument,
	plan: PipelineGraphPlan
): { resU: number; resV: number } {
	const geometryNode = doc.nodes.find((node) => node.id === plan.geometryNode);
	const params = geometryNode?.params ?? {};
	const resU = typeof params.resU === 'number' ? params.resU : 2;
	const resV = typeof params.resV === 'number' ? params.resV : 2;
	return { resU, resV };
}

/** Node-driven @vertex entry calling `plane_grid_position` for the wired geometry grid. */
export function assemblePipelineVertexWgsl(
	resU: number,
	resV: number,
	planeModuleSource: string
): string {
	return `${planeModuleSource.trim()}

struct VSOut {
	@builtin(position) position: vec4f,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
	var out: VSOut;
	let p = plane_grid_position(vid, ${resU}u, ${resV}u);
	out.position = vec4f(p, 1.0);
	return out;
}`;
}
