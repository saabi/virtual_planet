import { parseLayoutDocument, type LayoutDocument } from '@virtual-planet/subdivide';

export const GRAPH_EDITOR_LAYOUT_KEY = 'virtual-planet:graph-editor-layout:v1';

export interface StoredEditorChrome {
	version: 1;
	layout: LayoutDocument;
	previewMode?: 'cpu' | 'gpu' | 'mesh' | 'vegetation';
}

function storage(): Storage {
	if (typeof localStorage === 'undefined') {
		throw new Error('localStorage is not available');
	}
	return localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadEditorChrome(
	key = GRAPH_EDITOR_LAYOUT_KEY,
	defaultZone = 'canvas'
): StoredEditorChrome | null {
	const raw = storage().getItem(key);
	if (raw === null) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed) || parsed.version !== 1 || parsed.layout === undefined) {
		return null;
	}

	try {
		const layout = parseLayoutDocument(parsed.layout, defaultZone);
		const chrome: StoredEditorChrome = { version: 1, layout };
		if (
			parsed.previewMode === 'cpu' ||
			parsed.previewMode === 'gpu' ||
			parsed.previewMode === 'mesh' ||
			parsed.previewMode === 'vegetation'
		) {
			chrome.previewMode = parsed.previewMode;
		}
		return chrome;
	} catch {
		return null;
	}
}

export function saveEditorChrome(chrome: StoredEditorChrome, key = GRAPH_EDITOR_LAYOUT_KEY): void {
	storage().setItem(key, JSON.stringify(chrome));
}

export function clearEditorChrome(key = GRAPH_EDITOR_LAYOUT_KEY): void {
	storage().removeItem(key);
}
