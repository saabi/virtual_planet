import type { DividerType, LayoutGroup, LayoutPane, PaneBounds, RectLike } from './types.js';

export class RectData {
	pos: number;
	size: number;
	prev: RectData | DividerData | null;
	next: RectData | DividerData | null;
	parent: GroupData | null = null;

	constructor(pos: number, size: number, prev: RectData | DividerData | null, next: RectData | DividerData | null) {
		this.pos = pos;
		this.size = size;
		this.prev = prev;
		this.next = next;
	}

	bounds(rect: RectLike): PaneBounds {
		const width = rect.right - rect.left;
		const height = rect.bottom - rect.top;

		return {
			left: rect.left + width * this.getLeft(),
			top: rect.top + height * this.getTop(),
			width: width * this.getWidth(),
			height: height * this.getHeight()
		};
	}

	getPos(row: boolean): number {
		let pos = 0;

		let node: RectData = this;
		while (node.parent) {
			if (node.parent.row === row) pos = node.pos + node.size * pos;
			node = node.parent;
		}

		return pos;
	}

	getLeft(): number {
		return this.getPos(true);
	}

	getTop(): number {
		return this.getPos(false);
	}

	getSize(row: boolean): number {
		let size = 1;

		let node: RectData = this;
		while (node.parent) {
			if (node.parent.row === row) size *= node.size;
			node = node.parent;
		}

		return size;
	}

	getWidth(): number {
		return this.getSize(true);
	}

	getHeight(): number {
		return this.getSize(false);
	}

	setRange(a: number, b: number): void {
		this.pos = a;
		this.size = b - a;
	}
}

export class PaneData extends RectData {
	id: string;
	zone: string;

	constructor(
		id: string,
		options: {
			pos: number;
			size: number;
			prev: RectData | DividerData | null;
			next: RectData | DividerData | null;
			zone: string;
		}
	) {
		super(options.pos, options.size, options.prev, options.next);
		this.id = id;
		this.zone = options.zone;
	}

	/** Copy constructor used when splitting a pane. */
	static fromPane(id: string, pane: PaneData): PaneData {
		return new PaneData(id, {
			pos: pane.pos,
			size: pane.size,
			prev: pane.prev,
			next: pane.next,
			zone: pane.zone
		});
	}

	destroy(panes: PaneData[], _dividers: DividerData[]): void {
		const index = panes.indexOf(this);
		if (index === -1) return;
		panes.splice(index, 1);
	}

	toJSObject(): LayoutPane {
		return {
			type: 'pane',
			id: this.id,
			zone: this.zone,
			pos: this.pos,
			size: this.size
		};
	}
}

export class GroupData extends RectData {
	row: boolean;
	children: Array<PaneData | GroupData> = [];
	dividers: DividerData[] = [];

	constructor(
		row: boolean,
		options: {
			pos: number;
			size: number;
			prev: RectData | DividerData | null;
			next: RectData | DividerData | null;
		}
	) {
		super(options.pos, options.size, options.prev, options.next);
		this.row = row;
	}

	addChild(child: PaneData | GroupData): void {
		this.children.push(child);
		child.parent = this;
	}

	replaceChild(child: PaneData | GroupData, replacement: GroupData): void {
		const index = this.children.indexOf(child);
		if (index === -1) throw new Error('Unexpected error');
		this.children[index] = replacement;

		replacement.parent = this;

		child.parent = replacement;
		replacement.children.push(child);
	}

	destroy(panes: PaneData[], dividers: DividerData[]): void {
		let i = this.children.length;
		while (i--) this.children[i]!.destroy(panes, dividers);

		i = this.dividers.length;
		while (i--) this.dividers[i]!.destroy(dividers);
	}

	toJSObject(): LayoutGroup {
		return {
			type: 'group',
			row: this.row,
			pos: this.pos,
			size: this.size,
			children: this.children.map((child) => child.toJSObject())
		};
	}
}

export class DividerData {
	id: number;
	type: DividerType;
	parent: GroupData;
	position: number | null;
	prev: RectData | null;
	next: RectData | null;

	constructor(options: {
		id: number;
		type: DividerType;
		group: GroupData;
		position: number | null;
		prev: RectData | null;
		next: RectData | null;
	}) {
		this.id = options.id;
		this.type = options.type;
		this.parent = options.group;
		this.position = options.position;
		this.prev = options.prev;
		this.next = options.next;

		options.group.dividers.push(this);
	}

	destroy(dividers: DividerData[]): void {
		const index = dividers.indexOf(this);
		if (index === -1) throw new Error('Unexpected error');
		dividers.splice(index, 1);
	}
}

export function isPaneData(node: RectData): node is PaneData {
	return 'zone' in node;
}

function walkGroupForPanes(group: GroupData, result: PaneData[]): void {
	for (const child of group.children) {
		if (isPaneData(child)) {
			result.push(child);
		} else {
			walkGroupForPanes(child, result);
		}
	}
}

/** Collect all panes from the runtime tree (keeps `panes` state in sync). */
export function collectPanes(root: GroupData | null): PaneData[] {
	if (!root) return [];
	const result: PaneData[] = [];
	walkGroupForPanes(root, result);
	return result;
}

function walkGroupForDividers(group: GroupData, result: DividerData[]): void {
	result.push(...group.dividers);
	for (const child of group.children) {
		if (!isPaneData(child)) {
			walkGroupForDividers(child, result);
		}
	}
}

/** Collect all dividers from the runtime tree. */
export function collectDividers(root: GroupData | null): DividerData[] {
	if (!root) return [];
	const result: DividerData[] = [];
	walkGroupForDividers(root, result);
	return result;
}
