import { deserializeGraph, serializeGraph, type GraphDocument } from '@world-lab/graph';
import { parseLayoutDocument, type LayoutDocument } from '@world-lab/subdivide';

import { dedupeGraphIds } from './graphIds.js';
import { resyncGraphPortMetadata } from './graphSync.js';

export const GRAPH_ARTIFACT_VERSION = '1';

export interface GraphArtifactMeta {
	createdAt?: string;
	updatedAt?: string;
	sample?: boolean;
}

export interface GraphArtifact {
	version: string;
	name: string;
	graph: GraphDocument;
	layout?: LayoutDocument;
	meta?: GraphArtifactMeta;
}

export interface DocumentListEntry {
	name: string;
	updatedAt?: string;
	sample?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGraphDocumentShape(value: unknown): value is GraphDocument {
	return (
		isRecord(value) &&
		Array.isArray(value.nodes) &&
		Array.isArray(value.edges) &&
		typeof value.version === 'string'
	);
}

function normalizeGraph(raw: unknown): GraphDocument {
	if (typeof raw === 'string') {
		return dedupeGraphIds(resyncGraphPortMetadata(deserializeGraph(raw)));
	}
	if (!isGraphDocumentShape(raw)) {
		throw new Error('Graph artifact must include a graph document');
	}
	return dedupeGraphIds(resyncGraphPortMetadata(deserializeGraph(JSON.stringify(raw))));
}

function normalizeLayout(raw: unknown, defaultZone = 'canvas'): LayoutDocument | undefined {
	if (raw === undefined) return undefined;
	return parseLayoutDocument(raw, defaultZone);
}

/** Parse a downloaded/uploaded JSON file as a `GraphArtifact` (wrapper or bare graph). */
export function parseGraphArtifact(json: string, defaultLayoutZone = 'canvas'): GraphArtifact {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('Invalid graph JSON');
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Graph JSON must be an object');
	}

	if (isRecord(parsed) && parsed.graph !== undefined) {
		const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Imported';
		const graph = normalizeGraph(parsed.graph);
		const layout = normalizeLayout(parsed.layout, defaultLayoutZone);
		const meta = isRecord(parsed.meta) ? (parsed.meta as GraphArtifactMeta) : undefined;
		return {
			version: typeof parsed.version === 'string' ? parsed.version : GRAPH_ARTIFACT_VERSION,
			name,
			graph,
			...(layout !== undefined ? { layout } : {}),
			...(meta !== undefined ? { meta } : {})
		};
	}

	if (isGraphDocumentShape(parsed)) {
		const graph = normalizeGraph(parsed);
		return {
			version: GRAPH_ARTIFACT_VERSION,
			name: 'Imported',
			graph
		};
	}

	throw new Error('Graph JSON must be a GraphArtifact wrapper or bare GraphDocument');
}

/** Back-compat helper — returns only the graph IR from a file. */
export function parseGraphFile(json: string): GraphDocument {
	return parseGraphArtifact(json).graph;
}

export function serializeGraphArtifact(artifact: GraphArtifact): string {
	return JSON.stringify({
		version: artifact.version,
		name: artifact.name,
		graph: JSON.parse(serializeGraph(artifact.graph)),
		...(artifact.layout !== undefined ? { layout: artifact.layout } : {}),
		...(artifact.meta !== undefined ? { meta: artifact.meta } : {})
	});
}

export function formatGraphForDownload(artifact: GraphArtifact): string {
	return serializeGraphArtifact(artifact);
}

export function createGraphArtifact(
	name: string,
	graph: GraphDocument,
	options?: { layout?: LayoutDocument; sample?: boolean; createdAt?: string }
): GraphArtifact {
	const now = new Date().toISOString();
	return {
		version: GRAPH_ARTIFACT_VERSION,
		name,
		graph,
		...(options?.layout !== undefined ? { layout: options.layout } : {}),
		meta: {
			...(options?.createdAt ? { createdAt: options.createdAt } : { createdAt: now }),
			updatedAt: now,
			...(options?.sample ? { sample: true } : {})
		}
	};
}
