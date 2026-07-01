import type { GraphDocument, Node } from '@virtual-planet/graph';

export function collectNodeIds(doc: GraphDocument): Set<string> {
	return new Set(doc.nodes.map((node) => node.id));
}

export function collectEdgeIds(doc: GraphDocument): Set<string> {
	return new Set(doc.edges.map((edge) => edge.id));
}

/** Mint a node id unique against `usedIds` (counter-suffixed per primitive). */
export function mintNodeId(usedIds: ReadonlySet<string>, primitiveId: string): string {
	const prefix = `n_${primitiveId.replace(/\./g, '_')}_`;
	let max = 0;
	for (const id of usedIds) {
		if (!id.startsWith(prefix)) continue;
		const suffix = Number(id.slice(prefix.length));
		if (Number.isFinite(suffix) && suffix > max) max = suffix;
	}
	let n = max + 1;
	let candidate = `${prefix}${n}`;
	while (usedIds.has(candidate)) {
		n += 1;
		candidate = `${prefix}${n}`;
	}
	return candidate;
}

/** Mint an edge id unique against `usedIds` (`e_N` scheme). */
export function mintEdgeId(usedIds: ReadonlySet<string>): string {
	let max = 0;
	for (const id of usedIds) {
		const match = /^e_(\d+)$/.exec(id);
		if (match) max = Math.max(max, Number(match[1]));
	}
	let n = max + 1;
	let candidate = `e_${n}`;
	while (usedIds.has(candidate)) {
		n += 1;
		candidate = `e_${n}`;
	}
	return candidate;
}

/**
 * Re-id duplicate node/edge ids so the document is collision-free. First occurrence
 * keeps its id; later duplicates get fresh ids (edges keep pointing at the first id).
 */
export function dedupeGraphIds(doc: GraphDocument): GraphDocument {
	const usedNodeIds = new Set<string>();
	const nodes: Node[] = [];

	for (const node of doc.nodes) {
		if (!usedNodeIds.has(node.id)) {
			usedNodeIds.add(node.id);
			nodes.push(node);
			continue;
		}
		const newId = mintNodeId(usedNodeIds, node.primitive);
		usedNodeIds.add(newId);
		nodes.push({ ...node, id: newId });
	}

	const usedEdgeIds = new Set<string>();
	const edges = doc.edges.map((edge) => {
		if (!usedEdgeIds.has(edge.id)) {
			usedEdgeIds.add(edge.id);
			return edge;
		}
		const newId = mintEdgeId(usedEdgeIds);
		usedEdgeIds.add(newId);
		return { ...edge, id: newId };
	});

	return { ...doc, nodes, edges };
}
