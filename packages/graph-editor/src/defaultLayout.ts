import { createPaneId, type LayoutDocument, type LayoutNode } from '@world-lab/subdivide';

/** Optional zones (compiled, markup) are omitted — open via pane context menus. */
export const DEFAULT_GRAPH_EDITOR_ZONES = [
	'palette',
	'canvas',
	'code',
	'inspector',
	'validation',
	'preview'
] as const;

/** The editor's default pane tree. */
export function defaultGraphEditorLayout(): LayoutDocument {
	return {
		root: {
			type: 'group',
			row: true,
			pos: 0,
			size: 1,
			children: [
				{
					type: 'group',
					row: false,
					pos: 0,
					size: 0.10874089490114464,
					children: [
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'palette',
							pos: 0,
							size: 1
						}
					]
				},
				{
					type: 'group',
					row: false,
					pos: 0.10874089490114464,
					size: 0.6742976066597295,
					children: [
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'canvas',
							pos: 0,
							size: 0.4945770065075922
						},
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'code',
							pos: 0.4945770065075922,
							size: 0.5054229934924078
						}
					]
				},
				{
					type: 'group',
					row: false,
					pos: 0.7830385015608741,
					size: 0.21696149843912593,
					children: [
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'inspector',
							pos: 0,
							size: 0.2299349240780911
						},
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'validation',
							pos: 0.2299349240780911,
							size: 0.17570498915401303
						},
						{
							type: 'pane',
							id: createPaneId(),
							zone: 'preview',
							pos: 0.40563991323210413,
							size: 0.5943600867678959
						}
					]
				}
			]
		}
	};
}

/** Collect zone ids from a layout tree (for tests). */
export function collectLayoutZones(node: LayoutNode): string[] {
	if (node.type === 'pane') return [node.zone];
	return node.children.flatMap(collectLayoutZones);
}
