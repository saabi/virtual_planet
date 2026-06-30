import { describe, expect, it } from 'vitest';
import {
	collectLayoutZones,
	DEFAULT_GRAPH_EDITOR_ZONES,
	defaultGraphEditorLayout
} from './defaultLayout.js';

describe('@virtual-planet/graph-editor defaultGraphEditorLayout', () => {
	it('includes the v2 default zones and omits optional compiled/markup panes', () => {
		const layout = defaultGraphEditorLayout();
		const zones = collectLayoutZones(layout.root);
		expect(zones).toEqual([...DEFAULT_GRAPH_EDITOR_ZONES]);
		expect(zones).not.toContain('compiled');
		expect(zones).not.toContain('markup');
	});

	it('uses palette | canvas+code | inspector stack column proportions', () => {
		const { children } = defaultGraphEditorLayout().root;
		expect(children).toHaveLength(3);

		const [paletteCol, centerCol, rightCol] = children;
		expect(paletteCol?.type).toBe('group');
		expect(centerCol?.type).toBe('group');
		expect(rightCol?.type).toBe('group');

		if (paletteCol?.type !== 'group' || centerCol?.type !== 'group' || rightCol?.type !== 'group') {
			return;
		}

		expect(paletteCol.size).toBeCloseTo(0.109, 2);
		expect(centerCol.size).toBeCloseTo(0.674, 2);
		expect(rightCol.size).toBeCloseTo(0.217, 2);

		const centerPanes = centerCol.children.filter((child) => child.type === 'pane');
		expect(centerPanes.map((pane) => pane.zone)).toEqual(['canvas', 'code']);
		expect(centerPanes[0]?.size).toBeCloseTo(0.495, 2);
		expect(centerPanes[1]?.size).toBeCloseTo(0.505, 2);

		const rightPanes = rightCol.children.filter((child) => child.type === 'pane');
		expect(rightPanes.map((pane) => pane.zone)).toEqual(['inspector', 'validation', 'preview']);
		expect(rightPanes[2]?.size).toBeCloseTo(0.594, 2);
	});
});
