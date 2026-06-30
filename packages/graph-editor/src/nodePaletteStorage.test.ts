import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
	loadPaletteState,
	NODE_PALETTE_STORAGE_KEY,
	savePaletteState
} from './nodePaletteStorage.js';

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

describe('@virtual-planet/graph-editor nodePaletteStorage', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createStorageMock());
	});

	it('round-trips palette mode and per-mode expanded groups', () => {
		savePaletteState({
			mode: 'contract',
			expandedByMode: {
				section: ['math'],
				contract: ['f32->f32'],
				both: []
			}
		});
		expect(loadPaletteState()).toEqual({
			mode: 'contract',
			expandedByMode: {
				section: ['math'],
				contract: ['f32->f32'],
				both: []
			}
		});
	});

	it('defaults to section mode with all groups collapsed when storage is empty', () => {
		expect(loadPaletteState()).toEqual({
			mode: 'section',
			expandedByMode: { section: [], contract: [], both: [] }
		});
	});

	it('ignores corrupt storage payloads', () => {
		localStorage.setItem(NODE_PALETTE_STORAGE_KEY, '{bad');
		expect(loadPaletteState()).toEqual({
			mode: 'section',
			expandedByMode: { section: [], contract: [], both: [] }
		});
	});

	it('drops legacy collapsedGroups and starts collapsed', () => {
		localStorage.setItem(
			NODE_PALETTE_STORAGE_KEY,
			JSON.stringify({ mode: 'section', collapsedGroups: ['math', 'noise'] })
		);
		expect(loadPaletteState()).toEqual({
			mode: 'section',
			expandedByMode: { section: [], contract: [], both: [] }
		});
	});
});
