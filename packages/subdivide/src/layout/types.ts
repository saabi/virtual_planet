export type LayoutNode = LayoutGroup | LayoutPane;

export interface LayoutDocument {
	root: LayoutGroup;
}

export interface LayoutGroup {
	type: 'group';
	/** `true` = children side-by-side (vertical dividers). */
	row: boolean;
	pos: number;
	size: number;
	children: LayoutNode[];
}

export interface LayoutPane {
	type: 'pane';
	id: string;
	/** Opaque zone key resolved by the host snippet registry. */
	zone: string;
	pos: number;
	size: number;
}

export type DividerType = 'horizontal' | 'vertical';

export type SplitEdge = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface RectLike {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface PaneBounds {
	left: number;
	top: number;
	width: number;
	height: number;
}
