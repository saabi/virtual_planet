import { describe, expect, it } from 'vitest';

import {
	LEGACY_PREVIEW_PANE_KEY,
	ensurePaneSelection,
	migrateLegacyPreviewChrome,
	prunePaneSelection,
	resolvePaneBufferId,
	syncSelectionsForGraphChange
} from './previewPaneSelection.js';

const bufferIds = new Set(['a', 'b', 'c']);

describe('previewPaneSelection', () => {
	it('resolvePaneBufferId prefers a valid selection', () => {
		expect(resolvePaneBufferId({ bufferId: 'b' }, bufferIds, 'a')).toBe('b');
	});

	it('resolvePaneBufferId falls back to default then first buffer', () => {
		expect(resolvePaneBufferId(undefined, bufferIds, 'a')).toBe('a');
		expect(resolvePaneBufferId({ bufferId: 'missing' }, bufferIds, null)).toBe('a');
	});

	it('migrateLegacyPreviewChrome maps legacy chrome into the legacy pane key', () => {
		expect(
			migrateLegacyPreviewChrome({
				selectedPreviewBufferId: 'field',
				previewFamilyOverride: 'image',
				previewMode: 'gpu'
			})
		).toEqual({
			[LEGACY_PREVIEW_PANE_KEY]: {
				bufferId: 'field',
				familyOverride: 'image',
				rendererOverride: 'gpu'
			}
		});
	});

	it('ensurePaneSelection assigns legacy selection to a new pane id', () => {
		const next = ensurePaneSelection(
			migrateLegacyPreviewChrome({ selectedPreviewBufferId: 'b', previewFamilyOverride: 'data' }),
			'pane-1',
			bufferIds,
			'a'
		);
		expect(next[LEGACY_PREVIEW_PANE_KEY]).toBeUndefined();
		expect(next['pane-1']).toEqual({
			bufferId: 'b',
			familyOverride: 'data'
		});
	});

	it('syncSelectionsForGraphChange resets invalid buffers per pane independently', () => {
		const synced = syncSelectionsForGraphChange(
			{
				left: { bufferId: 'b', familyOverride: 'image' },
				right: { bufferId: 'missing', familyOverride: 'geometry' }
			},
			new Set(['b', 'c']),
			'b'
		);
		expect(synced.left).toEqual({ bufferId: 'b', familyOverride: 'image' });
		expect(synced.right).toEqual({ bufferId: 'b' });
	});

	it('prunePaneSelection removes a closed pane entry', () => {
		const pruned = prunePaneSelection(
			{ left: { bufferId: 'a' }, right: { bufferId: 'b' } },
			'left'
		);
		expect(pruned).toEqual({ right: { bufferId: 'b' } });
	});
});
