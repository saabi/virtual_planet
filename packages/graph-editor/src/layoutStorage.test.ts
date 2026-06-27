import { describe, expect, it, beforeEach, vi } from 'vitest';
import { defaultGraphEditorLayout } from './defaultLayout.js';
import {
	clearEditorChrome,
	GRAPH_EDITOR_LAYOUT_KEY,
	loadEditorChrome,
	saveEditorChrome
} from './layoutStorage.js';

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

describe('@virtual-planet/graph-editor layoutStorage', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createStorageMock());
	});

	it('round-trips layout and previewMode through localStorage', () => {
		const layout = defaultGraphEditorLayout();
		const palette = layout.root.children[0];
		if (palette?.type === 'pane') {
			palette.size = 0.22;
		}
		saveEditorChrome({ version: 1, layout, previewMode: 'gpu' });
		const loaded = loadEditorChrome();
		expect(loaded).not.toBeNull();
		expect(loaded!.previewMode).toBe('gpu');
		const loadedPalette = loaded!.layout.root.children[0];
		expect(loadedPalette?.type === 'pane' && loadedPalette.size).toBe(0.22);
	});

	it('returns null when storage is empty', () => {
		expect(loadEditorChrome()).toBeNull();
	});

	it('returns null for corrupt JSON without throwing', () => {
		localStorage.setItem(GRAPH_EDITOR_LAYOUT_KEY, '{not json');
		expect(loadEditorChrome()).toBeNull();
	});

	it('loads a layout that references an unknown zone', () => {
		const layout = defaultGraphEditorLayout();
		const palette = layout.root.children[0];
		if (palette?.type === 'pane') {
			palette.zone = 'unknown_zone';
		}
		saveEditorChrome({ version: 1, layout });
		expect(loadEditorChrome()).not.toBeNull();
	});

	it('clearEditorChrome removes the saved chrome', () => {
		saveEditorChrome({ version: 1, layout: defaultGraphEditorLayout(), previewMode: 'cpu' });
		clearEditorChrome();
		expect(loadEditorChrome()).toBeNull();
	});
});
