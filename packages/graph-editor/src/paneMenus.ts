import type { PaneContextAction } from '@virtual-planet/subdivide';

export interface GraphEditorPaneMenuHost {
	fitCanvasView: () => void;
	hasSelection: () => boolean;
	hasNodeSelection: () => boolean;
	deleteSelection: () => void;
	duplicateSelectedNode: () => void;
	setPreviewMode: (mode: 'cpu' | 'gpu' | 'mesh' | 'effect' | 'vegetation') => void;
	refreshPreview: () => void;
	clearSelection: () => void;
	saveCode: () => void;
	isCodeDirty: () => boolean;
	revertCode: () => void;
	resyncMarkup: () => void;
	copyMarkup: () => void;
	copyValidationReport: () => void;
}

export function createZoneContextMenus(
	host: GraphEditorPaneMenuHost
): Record<string, PaneContextAction[]> {
	return {
		canvas: [
			{
				id: 'fit-view',
				label: 'Fit view',
				run: () => host.fitCanvasView()
			},
			{
				id: 'delete-selection',
				label: 'Delete selection',
				disabled: !host.hasSelection(),
				run: () => host.deleteSelection()
			},
			{
				id: 'duplicate-node',
				label: 'Duplicate node',
				disabled: !host.hasNodeSelection(),
				run: () => host.duplicateSelectedNode()
			}
		],
		preview: [
			{
				id: 'preview-cpu',
				label: 'CPU preview',
				run: () => host.setPreviewMode('cpu')
			},
			{
				id: 'preview-gpu',
				label: 'GPU preview',
				run: () => host.setPreviewMode('gpu')
			},
			{
				id: 'preview-effect',
				label: 'Effect preview',
				run: () => host.setPreviewMode('effect')
			},
			{
				id: 'preview-mesh',
				label: 'Mesh preview',
				run: () => host.setPreviewMode('mesh')
			},
			{
				id: 'preview-vegetation',
				label: 'Vegetation preview',
				run: () => host.setPreviewMode('vegetation')
			},
			{
				id: 'preview-refresh',
				label: 'Refresh preview',
				run: () => host.refreshPreview()
			}
		],
		inspector: [
			{
				id: 'clear-selection',
				label: 'Clear selection',
				disabled: !host.hasSelection(),
				run: () => host.clearSelection()
			}
		],
		code: [
			{
				id: 'code-save',
				label: 'Save primitive',
				disabled: !host.isCodeDirty(),
				run: () => host.saveCode()
			},
			{
				id: 'code-revert',
				label: 'Revert draft',
				disabled: !host.isCodeDirty(),
				run: () => host.revertCode()
			}
		],
		markup: [
			{
				id: 'markup-resync',
				label: 'Re-sync from graph',
				run: () => host.resyncMarkup()
			},
			{
				id: 'markup-copy',
				label: 'Copy markup',
				run: () => host.copyMarkup()
			}
		],
		validation: [
			{
				id: 'validation-copy',
				label: 'Copy report',
				run: () => host.copyValidationReport()
			}
		]
	};
}
