import { describe, expect, it, beforeEach, vi } from 'vitest';
import { serializeGraph } from '@world-lab/graph';

import { defaultPreviewGraph } from './defaultGraph.js';
import { defaultGraphEditorLayout } from './defaultLayout.js';
import {
	createGraphArtifact,
	parseGraphArtifact,
	parseGraphFile,
	serializeGraphArtifact
} from './graphArtifact.js';
import {
	clearDocumentRegistry,
	deleteDocument,
	formatGraphForDownload,
	listDocuments,
	loadActiveDocument,
	loadDocument,
	loadGraphFromStorage,
	renameDocument,
	saveDocument,
	saveGraphToStorage
} from './documentStorage.js';

function createStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (index: number) => [...store.keys()][index] ?? null
	} satisfies Storage;
}

describe('@world-lab/graph-editor graphArtifact', () => {
	it('round-trips a bare GraphDocument through parseGraphFile', () => {
		const doc = defaultPreviewGraph();
		const parsed = parseGraphFile(serializeGraph(doc));
		expect(parsed).toEqual(doc);
	});

	it('round-trips a GraphArtifact wrapper with layout and name', () => {
		const doc = defaultPreviewGraph();
		const layout = defaultGraphEditorLayout();
		const artifact = createGraphArtifact('My graph', doc, { layout });
		const parsed = parseGraphArtifact(serializeGraphArtifact(artifact));
		expect(parsed.name).toBe('My graph');
		expect(parsed.graph).toEqual(doc);
		expect(parsed.layout).toEqual(layout);
	});

	it('rejects invalid JSON', () => {
		expect(() => parseGraphArtifact('not json')).toThrow(/invalid graph json/i);
	});
});

describe('@world-lab/graph-editor documentStorage', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createStorageMock());
		clearDocumentRegistry();
	});

	it('save/load/list/delete/rename named documents', () => {
		const doc = defaultPreviewGraph();
		const layout = defaultGraphEditorLayout();
		saveDocument(createGraphArtifact('Alpha', doc, { layout }));
		saveDocument(createGraphArtifact('Beta', doc));

		expect(listDocuments().map((entry) => entry.name).sort()).toEqual(['Alpha', 'Beta']);
		expect(loadDocument('Alpha')?.layout).toEqual(layout);
		expect(loadActiveDocument()?.name).toBe('Beta');

		renameDocument('Alpha', 'Alpha renamed');
		expect(loadDocument('Alpha renamed')?.graph).toEqual(doc);
		expect(loadDocument('Alpha')).toBeNull();

		deleteDocument('Beta');
		expect(listDocuments().map((entry) => entry.name)).toEqual(['Alpha renamed']);
	});

	it('migrates the legacy single-slot graph into a named document', () => {
		const doc = defaultPreviewGraph();
		localStorage.setItem('virtual-planet:graph-editor:v1', serializeGraph(doc));

		expect(loadGraphFromStorage()).toEqual(doc);
		expect(listDocuments().some((entry) => entry.name === 'Migrated session')).toBe(true);
		expect(localStorage.getItem('virtual-planet:graph-editor:v1')).toBeNull();
	});

	it('formatGraphForDownload emits the artifact wrapper', () => {
		const artifact = createGraphArtifact('Download me', defaultPreviewGraph());
		const parsed = parseGraphArtifact(formatGraphForDownload(artifact));
		expect(parsed.name).toBe('Download me');
		expect(parsed.graph).toEqual(artifact.graph);
	});

	it('persists through deprecated saveGraphToStorage for compatibility', () => {
		const doc = defaultPreviewGraph();
		saveGraphToStorage(doc);
		expect(loadGraphFromStorage()).toEqual(doc);
	});
});
