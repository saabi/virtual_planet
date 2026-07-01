import { parseLayoutDocument, type LayoutDocument } from '@virtual-planet/subdivide';

import type { PreviewFamily } from './previewBuffers.js';
import type { NodeColorMode } from './nodeAccentColor.js';

export const GRAPH_EDITOR_LAYOUT_KEY = 'virtual-planet:graph-editor-layout:v2';

export interface StoredEditorChrome {
	version: 1;
	layout: LayoutDocument;
	/** @deprecated Legacy backend tab — migrated to `selectedPreviewBufferId`. */
	previewMode?: 'cpu' | 'gpu' | 'mesh' | 'vegetation' | 'effect';
	selectedPreviewBufferId?: string;
	previewFamilyOverride?: PreviewFamily | null;
	nodeColorMode?: NodeColorMode;
	/** When true (default), loading a document applies its saved pane layout. */
	loadDocumentLayout?: boolean;
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

const PREVIEW_FAMILIES: readonly PreviewFamily[] = ['geometry', 'image', 'data', 'audio'];

function parsePreviewFamily(value: unknown): PreviewFamily | null {
	if (typeof value !== 'string') return null;
	return PREVIEW_FAMILIES.includes(value as PreviewFamily) ? (value as PreviewFamily) : null;
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
			parsed.previewMode === 'vegetation' ||
			parsed.previewMode === 'effect'
		) {
			chrome.previewMode = parsed.previewMode;
		}
		if (typeof parsed.selectedPreviewBufferId === 'string') {
			chrome.selectedPreviewBufferId = parsed.selectedPreviewBufferId;
		}
		if (parsed.previewFamilyOverride === null) {
			chrome.previewFamilyOverride = null;
		} else {
			const family = parsePreviewFamily(parsed.previewFamilyOverride);
			if (family) chrome.previewFamilyOverride = family;
		}
		if (
			parsed.nodeColorMode === 'category' ||
			parsed.nodeColorMode === 'contract' ||
			parsed.nodeColorMode === 'off'
		) {
			chrome.nodeColorMode = parsed.nodeColorMode;
		}
		if (parsed.loadDocumentLayout === false) {
			chrome.loadDocumentLayout = false;
		} else if (parsed.loadDocumentLayout === true) {
			chrome.loadDocumentLayout = true;
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
