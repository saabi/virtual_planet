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

	it('round-trips layout and preview selection through localStorage', () => {
		const layout = defaultGraphEditorLayout();
		const paletteCol = layout.root.children[0];
		if (paletteCol?.type === 'group') {
			paletteCol.size = 0.22;
		}
		saveEditorChrome({
			version: 1,
			layout,
			selectedPreviewBufferId: 'field',
			previewFamilyOverride: 'image'
		});
		const loaded = loadEditorChrome();
		expect(loaded).not.toBeNull();
		expect(loaded!.selectedPreviewBufferId).toBe('field');
		expect(loaded!.previewFamilyOverride).toBe('image');
		const loadedPaletteCol = loaded!.layout.root.children[0];
		expect(loadedPaletteCol?.type === 'group' && loadedPaletteCol.size).toBe(0.22);
	});

	it('round-trips nodeColorMode chrome', () => {
		saveEditorChrome({
			version: 1,
			layout: defaultGraphEditorLayout(),
			nodeColorMode: 'contract'
		});
		expect(loadEditorChrome()?.nodeColorMode).toBe('contract');
	});

	it('round-trips loadDocumentLayout chrome', () => {
		saveEditorChrome({
			version: 1,
			layout: defaultGraphEditorLayout(),
			loadDocumentLayout: false
		});
		expect(loadEditorChrome()?.loadDocumentLayout).toBe(false);
	});

	it('still loads legacy previewMode chrome', () => {
		saveEditorChrome({ version: 1, layout: defaultGraphEditorLayout(), previewMode: 'gpu' });
		expect(loadEditorChrome()?.previewMode).toBe('gpu');
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
		const paletteCol = layout.root.children[0];
		const palettePane =
			paletteCol?.type === 'group' ? paletteCol.children[0] : undefined;
		if (palettePane?.type === 'pane') {
			palettePane.zone = 'unknown_zone';
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
