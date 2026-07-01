import type { GraphDocument } from '@virtual-planet/graph';

import {
	createGraphArtifact,
	formatGraphForDownload,
	parseGraphArtifact,
	parseGraphFile,
	serializeGraphArtifact,
	type DocumentListEntry,
	type GraphArtifact
} from './graphArtifact.js';

export {
	createGraphArtifact,
	formatGraphForDownload,
	parseGraphArtifact,
	parseGraphFile,
	serializeGraphArtifact,
	type DocumentListEntry,
	type GraphArtifact,
	type GraphArtifactMeta
} from './graphArtifact.js';

/** @deprecated Legacy single-slot key — migrated into the named document registry on first access. */
export const GRAPH_EDITOR_STORAGE_KEY = 'virtual-planet:graph-editor:v1';

const DOCUMENT_REGISTRY_KEY = 'virtual-planet:graph-documents-registry:v1';
const MIGRATED_LEGACY_NAME = 'Migrated session';

interface DocumentRegistry {
	version: 1;
	activeName: string | null;
	documents: Record<string, GraphArtifact>;
}

function storage(): Storage {
	if (typeof localStorage === 'undefined') {
		throw new Error('localStorage is not available');
	}
	return localStorage;
}

function emptyRegistry(): DocumentRegistry {
	return { version: 1, activeName: null, documents: {} };
}

function loadRegistry(): DocumentRegistry {
	const raw = storage().getItem(DOCUMENT_REGISTRY_KEY);
	if (raw === null) {
		const registry = emptyRegistry();
		migrateLegacySingleSlot(registry);
		return registry;
	}

	try {
		const parsed = JSON.parse(raw) as DocumentRegistry;
		if (parsed.version !== 1 || typeof parsed.documents !== 'object' || parsed.documents === null) {
			return emptyRegistry();
		}
		const registry: DocumentRegistry = {
			version: 1,
			activeName: typeof parsed.activeName === 'string' ? parsed.activeName : null,
			documents: parsed.documents
		};
		migrateLegacySingleSlot(registry);
		return registry;
	} catch {
		return emptyRegistry();
	}
}

function saveRegistry(registry: DocumentRegistry): void {
	storage().setItem(DOCUMENT_REGISTRY_KEY, JSON.stringify(registry));
}

function migrateLegacySingleSlot(registry: DocumentRegistry): void {
	const legacy = storage().getItem(GRAPH_EDITOR_STORAGE_KEY);
	if (legacy === null) return;
	if (registry.documents[MIGRATED_LEGACY_NAME]) {
		storage().removeItem(GRAPH_EDITOR_STORAGE_KEY);
		return;
	}

	try {
		const graph = parseGraphFile(legacy);
		registry.documents[MIGRATED_LEGACY_NAME] = createGraphArtifact(MIGRATED_LEGACY_NAME, graph);
		registry.activeName = MIGRATED_LEGACY_NAME;
		saveRegistry(registry);
	} catch {
		// ignore corrupt legacy slot
	} finally {
		storage().removeItem(GRAPH_EDITOR_STORAGE_KEY);
	}
}

function assertWritableName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Document name is required');
	return trimmed;
}

export function listDocuments(): DocumentListEntry[] {
	const registry = loadRegistry();
	return Object.values(registry.documents)
		.map((artifact) => ({
			name: artifact.name,
			updatedAt: artifact.meta?.updatedAt,
			sample: artifact.meta?.sample
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadDocument(name: string): GraphArtifact | null {
	const registry = loadRegistry();
	return registry.documents[assertWritableName(name)] ?? null;
}

export function loadActiveDocument(): GraphArtifact | null {
	const registry = loadRegistry();
	if (!registry.activeName) return null;
	return registry.documents[registry.activeName] ?? null;
}

export function saveDocument(artifact: GraphArtifact): void {
	const registry = loadRegistry();
	const name = assertWritableName(artifact.name);
	const existing = registry.documents[name];
	const now = new Date().toISOString();
	const next: GraphArtifact = {
		...artifact,
		name,
		version: artifact.version || '1',
		meta: {
			createdAt: existing?.meta?.createdAt ?? artifact.meta?.createdAt ?? now,
			updatedAt: now,
			sample: artifact.meta?.sample
		}
	};
	registry.documents[name] = next;
	registry.activeName = name;
	saveRegistry(registry);
}

export function deleteDocument(name: string): void {
	const registry = loadRegistry();
	const key = assertWritableName(name);
	const artifact = registry.documents[key];
	if (!artifact) return;
	if (artifact.meta?.sample) {
		throw new Error('Cannot delete a read-only sample document');
	}
	delete registry.documents[key];
	if (registry.activeName === key) {
		registry.activeName = null;
	}
	saveRegistry(registry);
}

export function renameDocument(fromName: string, toName: string): void {
	const registry = loadRegistry();
	const from = assertWritableName(fromName);
	const to = assertWritableName(toName);
	const artifact = registry.documents[from];
	if (!artifact) throw new Error(`Unknown document: ${from}`);
	if (artifact.meta?.sample) throw new Error('Cannot rename a read-only sample document');
	if (registry.documents[to] && to !== from) throw new Error(`Document already exists: ${to}`);

	const renamed: GraphArtifact = { ...artifact, name: to };
	delete registry.documents[from];
	registry.documents[to] = renamed;
	if (registry.activeName === from) registry.activeName = to;
	saveRegistry(registry);
}

export function setActiveDocumentName(name: string | null): void {
	const registry = loadRegistry();
	registry.activeName = name;
	saveRegistry(registry);
}

/** @deprecated Use `saveDocument` / named registry. Writes through to the active named document when possible. */
export function saveGraphToStorage(doc: GraphDocument, key = GRAPH_EDITOR_STORAGE_KEY): void {
	if (key !== GRAPH_EDITOR_STORAGE_KEY) {
		storage().setItem(key, serializeGraphArtifact(createGraphArtifact('Custom', doc)));
		return;
	}
	const registry = loadRegistry();
	const name = registry.activeName ?? MIGRATED_LEGACY_NAME;
	saveDocument(createGraphArtifact(name, doc, { createdAt: registry.documents[name]?.meta?.createdAt }));
}

/** @deprecated Use `loadActiveDocument` / `loadDocument`. */
export function loadGraphFromStorage(key = GRAPH_EDITOR_STORAGE_KEY): GraphDocument | null {
	if (key !== GRAPH_EDITOR_STORAGE_KEY) {
		const raw = storage().getItem(key);
		if (raw === null) return null;
		return parseGraphFile(raw);
	}
	return loadActiveDocument()?.graph ?? null;
}

export function clearGraphStorage(key = GRAPH_EDITOR_STORAGE_KEY): void {
	if (key !== GRAPH_EDITOR_STORAGE_KEY) {
		storage().removeItem(key);
		return;
	}
	const registry = loadRegistry();
	if (registry.activeName) {
		delete registry.documents[registry.activeName];
		registry.activeName = null;
		saveRegistry(registry);
	}
}

/** Test helper — reset named document registry. */
export function clearDocumentRegistry(): void {
	storage().removeItem(DOCUMENT_REGISTRY_KEY);
	storage().removeItem(GRAPH_EDITOR_STORAGE_KEY);
}
