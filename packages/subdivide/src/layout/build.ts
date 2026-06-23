import { DividerData, GroupData, PaneData } from './runtime.js';
import type { LayoutDocument, LayoutGroup, LayoutNode, LayoutPane } from './types.js';

export interface RuntimeTree {
	root: GroupData;
	panes: PaneData[];
	dividers: DividerData[];
	usedIds: Set<string>;
}

export function buildRuntimeTree(layout: LayoutDocument, defaultZone = 'default'): RuntimeTree {
	const panes: PaneData[] = [];
	const dividers: DividerData[] = [];
	const usedIds = new Set<string>();
	let dividerId = 0;

	const createGroup = (data: LayoutGroup): GroupData => {
		const group = new GroupData(data.row, {
			pos: data.pos,
			size: data.size,
			prev: null,
			next: null
		});

		let lastChild: PaneData | GroupData | null = null;

		const children = [...data.children].sort((a, b) => a.pos - b.pos);

		children.forEach((childData, i) => {
			let child: PaneData | GroupData;

			if (childData.type === 'group') {
				child = createGroup(childData);
			} else {
				child = new PaneData(childData.id, {
					pos: childData.pos,
					size: childData.size,
					prev: null,
					next: null,
					zone: childData.zone || defaultZone
				});

				usedIds.add(childData.id);
				panes.push(child);
			}

			group.addChild(child);

			if (i > 0 && lastChild) {
				child.prev = lastChild;
				lastChild.next = child;

				const dividerType = group.row ? 'vertical' : 'horizontal';

				const divider = new DividerData({
					id: dividerId++,
					type: dividerType,
					group,
					position: child.pos,
					prev: lastChild,
					next: child
				});

				if (child.prev && 'next' in child.prev) {
					child.prev.next = divider;
				}
				child.prev = divider;

				dividers.push(divider);
			}

			lastChild = child;
		});

		return group;
	};

	const root = createGroup(layout.root);

	return { root, panes, dividers, usedIds };
}

export function isLayoutGroup(node: LayoutNode): node is LayoutGroup {
	return node.type === 'group';
}

export function isLayoutPane(node: LayoutNode): node is LayoutPane {
	return node.type === 'pane';
}
