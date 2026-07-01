import type { GraphDocument } from '@world-lab/graph';

export interface GraphNodeClipboard {
	primitiveId: string;
	params?: Record<string, unknown>;
}

export function copyNodeToClipboard(doc: GraphDocument, nodeId: string): GraphNodeClipboard {
	const node = doc.nodes.find((candidate) => candidate.id === nodeId);
	if (!node) {
		throw new Error(`Unknown node: ${nodeId}`);
	}

	return {
		primitiveId: node.primitive,
		...(node.params !== undefined ? { params: { ...node.params } } : {})
	};
}

export function pasteOffsetPosition(source: { x: number; y: number }): { x: number; y: number } {
	return { x: source.x + 24, y: source.y + 24 };
}
