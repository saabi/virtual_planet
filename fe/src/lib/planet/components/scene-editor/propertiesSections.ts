import type { NodeEditor } from '$lib/planet/scene/nodeSchemas.js';
import type { SceneNode } from '$lib/planet/scene/types.js';

export type PropsSuperSectionId =
	| 'transform'
	| 'node'
	| 'motion'
	| 'display'
	| 'appearance'
	| 'atmosphere'
	| 'actions';

export interface PropsSectionDef {
	id: PropsSuperSectionId;
	title: string;
	defaultOpen?: boolean;
}

export const PROPS_SUPER_SECTIONS: PropsSectionDef[] = [
	{ id: 'transform', title: 'Transform', defaultOpen: true },
	{ id: 'node', title: 'Node' },
	{ id: 'motion', title: 'Motion' },
	{ id: 'display', title: 'Display' },
	{ id: 'appearance', title: 'Appearance' },
	{ id: 'atmosphere', title: 'Atmosphere' },
	{ id: 'actions', title: 'Actions' }
];

export interface PropsSectionContext {
	hasAppearance: boolean;
	hasDriver: boolean;
	editor: NodeEditor | null;
}

export function visiblePropsSections(
	node: SceneNode,
	ctx: PropsSectionContext
): PropsSuperSectionId[] {
	const out: PropsSuperSectionId[] = ['transform'];

	if (ctx.editor?.mode === 'schema') {
		out.push('node');
	}

	out.push('motion');

	if (node.driver?.type === 'kepler' || node.orbit) {
		out.push('display');
	}

	if (ctx.hasAppearance) {
		out.push('appearance', 'atmosphere', 'actions');
	}

	return out;
}

export function defaultOpenPropsSection(visible: PropsSuperSectionId[]): PropsSuperSectionId {
	return visible.includes('transform') ? 'transform' : visible[0] ?? 'transform';
}
