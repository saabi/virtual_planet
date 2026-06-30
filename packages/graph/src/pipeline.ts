import { getPrimitive } from './registry.js';
import type { GraphDocument, Node } from './types.js';

const PIPELINE_TARGET_ROLE = 'pipelineTarget';

/** Whether `node` is a pipeline render sink (e.g. `target.display`). */
export function isPipelineTarget(node: Node): boolean {
	const primitive = getPrimitive(node.primitive);
	return primitive?.metadata?.role === PIPELINE_TARGET_ROLE;
}

/** Node ids that terminate the graph — declared value outputs ∪ pipeline render targets. */
export function outputSinkNodeIds(doc: GraphDocument): string[] {
	const nodeIds = new Set(doc.nodes.map((node) => node.id));
	const sinks = new Set<string>();

	for (const output of doc.outputs) {
		if (nodeIds.has(output.from.node)) {
			sinks.add(output.from.node);
		}
	}

	for (const node of doc.nodes) {
		if (isPipelineTarget(node)) {
			sinks.add(node.id);
		}
	}

	return [...sinks];
}
