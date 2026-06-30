import type { PaletteMode } from './nodePaletteModel.js';

export const NODE_PALETTE_STORAGE_KEY = 'virtual-planet:graph-editor-palette:v1';

export interface StoredPaletteState {
	mode: PaletteMode;
	expandedByMode: Record<PaletteMode, string[]>;
}

const EMPTY_EXPANDED: Record<PaletteMode, string[]> = {
	section: [],
	contract: [],
	both: []
};

const DEFAULT_STATE: StoredPaletteState = {
	mode: 'section',
	expandedByMode: { ...EMPTY_EXPANDED }
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMode(value: unknown): PaletteMode | null {
	if (value === 'section' || value === 'contract' || value === 'both') return value;
	return null;
}

function parseExpandedList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseExpandedByMode(value: unknown): Record<PaletteMode, string[]> {
	if (!isRecord(value)) return { ...EMPTY_EXPANDED };
	return {
		section: parseExpandedList(value.section),
		contract: parseExpandedList(value.contract),
		both: parseExpandedList(value.both)
	};
}

export function loadPaletteState(key = NODE_PALETTE_STORAGE_KEY): StoredPaletteState {
	if (typeof localStorage === 'undefined') return { ...DEFAULT_STATE, expandedByMode: { ...EMPTY_EXPANDED } };

	const raw = localStorage.getItem(key);
	if (!raw) return { ...DEFAULT_STATE, expandedByMode: { ...EMPTY_EXPANDED } };

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return { ...DEFAULT_STATE, expandedByMode: { ...EMPTY_EXPANDED } };
		const mode = parseMode(parsed.mode) ?? DEFAULT_STATE.mode;
		// v1 stored `collapsedGroups` (inverted model); drop it and prefer `expandedByMode`.
		const expandedByMode = parseExpandedByMode(parsed.expandedByMode);
		return { mode, expandedByMode };
	} catch {
		return { ...DEFAULT_STATE, expandedByMode: { ...EMPTY_EXPANDED } };
	}
}

export function savePaletteState(state: StoredPaletteState, key = NODE_PALETTE_STORAGE_KEY): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(key, JSON.stringify(state));
}
