import type { LayoutDocument, LayoutNode } from '@virtual-planet/subdivide';

import type { PreviewFamily } from './previewBuffers.js';
import type { PreviewRenderer } from './previewBackend.js';

export interface PreviewPaneSelection {
	bufferId: string;
	familyOverride?: PreviewFamily | null;
	rendererOverride?: PreviewRenderer | null;
}

export type PreviewBuffersByPane = Record<string, PreviewPaneSelection>;

/** Chrome migration bucket for legacy single-pane preview selection. */
export const LEGACY_PREVIEW_PANE_KEY = '__legacy__';

export function resolvePaneBufferId(
	selection: PreviewPaneSelection | undefined,
	bufferIds: ReadonlySet<string>,
	defaultBufferId: string | null
): string | null {
	if (bufferIds.size === 0) return null;
	if (selection?.bufferId && bufferIds.has(selection.bufferId)) {
		return selection.bufferId;
	}
	if (defaultBufferId && bufferIds.has(defaultBufferId)) return defaultBufferId;
	return bufferIds.values().next().value ?? null;
}

export function migrateLegacyPreviewChrome(input: {
	selectedPreviewBufferId?: string;
	previewFamilyOverride?: PreviewFamily | null;
	previewMode?: 'cpu' | 'gpu' | 'mesh' | 'vegetation' | 'effect';
}): PreviewBuffersByPane {
	if (!input.selectedPreviewBufferId) return {};
	const selection: PreviewPaneSelection = { bufferId: input.selectedPreviewBufferId };
	if (input.previewFamilyOverride !== undefined) {
		selection.familyOverride = input.previewFamilyOverride;
	}
	if (input.previewMode === 'vegetation') {
		selection.rendererOverride = 'vegetation';
	} else if (input.previewMode === 'mesh') {
		selection.rendererOverride = 'mesh';
	} else if (input.previewMode === 'gpu') {
		selection.rendererOverride = 'gpu';
	} else if (input.previewMode === 'cpu') {
		selection.rendererOverride = 'cpu';
	} else if (input.previewMode === 'effect') {
		selection.rendererOverride = 'effect';
	}
	return { [LEGACY_PREVIEW_PANE_KEY]: selection };
}

export function ensurePaneSelection(
	byPane: PreviewBuffersByPane,
	paneId: string,
	bufferIds: ReadonlySet<string>,
	defaultBufferId: string | null
): PreviewBuffersByPane {
	if (bufferIds.size === 0) return byPane;

	const existing = byPane[paneId];
	if (existing?.bufferId && bufferIds.has(existing.bufferId)) {
		return byPane;
	}

	const legacy = byPane[LEGACY_PREVIEW_PANE_KEY];
	const next = { ...byPane };
	delete next[LEGACY_PREVIEW_PANE_KEY];

	const bufferId = resolvePaneBufferId(legacy ?? existing, bufferIds, defaultBufferId);
	if (!bufferId) return next;

	next[paneId] = {
		bufferId,
		familyOverride: legacy?.familyOverride ?? existing?.familyOverride,
		rendererOverride: legacy?.rendererOverride ?? existing?.rendererOverride
	};
	return next;
}

export function syncSelectionsForGraphChange(
	byPane: PreviewBuffersByPane,
	bufferIds: ReadonlySet<string>,
	defaultBufferId: string | null
): PreviewBuffersByPane {
	if (bufferIds.size === 0) return {};

	const next: PreviewBuffersByPane = {};
	for (const [paneId, selection] of Object.entries(byPane)) {
		if (paneId === LEGACY_PREVIEW_PANE_KEY) {
			if (selection.bufferId && bufferIds.has(selection.bufferId)) {
				next[paneId] = selection;
			}
			continue;
		}

		const stillValid = bufferIds.has(selection.bufferId);
		const bufferId = stillValid
			? selection.bufferId
			: resolvePaneBufferId(undefined, bufferIds, defaultBufferId);
		if (!bufferId) continue;

		next[paneId] = stillValid ? selection : { bufferId };
	}
	return next;
}

export function collectPaneIdsByZone(layout: LayoutDocument, zone: string): string[] {
	const ids: string[] = [];
	function walk(node: LayoutNode): void {
		if (node.type === 'pane') {
			if (node.zone === zone) ids.push(node.id);
			return;
		}
		for (const child of node.children) walk(child);
	}
	walk(layout.root);
	return ids;
}

export function syncPreviewPanesWithLayout(
	byPane: PreviewBuffersByPane,
	layout: LayoutDocument,
	bufferIds: ReadonlySet<string>,
	defaultBufferId: string | null,
	zone = 'preview'
): PreviewBuffersByPane {
	const activePaneIds = new Set(collectPaneIdsByZone(layout, zone));
	let next = byPane;
	for (const paneId of activePaneIds) {
		next = ensurePaneSelection(next, paneId, bufferIds, defaultBufferId);
	}
	const pruned: PreviewBuffersByPane = {};
	for (const [paneId, selection] of Object.entries(next)) {
		if (paneId === LEGACY_PREVIEW_PANE_KEY || activePaneIds.has(paneId)) {
			pruned[paneId] = selection;
		}
	}
	return pruned;
}

export function prunePaneSelection(
	byPane: PreviewBuffersByPane,
	paneId: string
): PreviewBuffersByPane {
	if (!(paneId in byPane)) return byPane;
	const next = { ...byPane };
	delete next[paneId];
	return next;
}
