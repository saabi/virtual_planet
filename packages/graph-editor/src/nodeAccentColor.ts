import { getPrimitive, swapFamily, type NodePrimitive } from '@world-lab/graph';

export type NodeColorMode = 'category' | 'contract' | 'off';

const CATEGORY_ACCENTS: Readonly<Record<string, string>> = {
	vector: 'hsl(220 42% 30%)',
	noise: 'hsl(270 38% 30%)',
	math: 'hsl(175 34% 28%)',
	constant: 'hsl(210 12% 30%)',
	geometry: 'hsl(140 34% 28%)',
	stage: 'hsl(28 44% 30%)',
	target: 'hsl(350 38% 30%)',
	buffer: 'hsl(35 28% 28%)',
	effect: 'hsl(45 48% 30%)',
	terrain: 'hsl(100 28% 28%)',
	material: 'hsl(300 28% 30%)',
	sdf: 'hsl(200 34% 28%)',
	colour: 'hsl(330 34% 30%)',
	Color: 'hsl(330 34% 30%)',
	Input: 'hsl(205 30% 30%)',
	host: 'hsl(205 30% 30%)',
	procedural: 'hsl(190 32% 28%)',
	surface: 'hsl(120 26% 28%)'
};

function categoryHead(category: string): string {
	const parts = category.split('/').filter(Boolean);
	return parts[0] ?? category;
}

function hashHue(input: string): number {
	let hash = 0;
	for (let index = 0; index < input.length; index += 1) {
		hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
	}
	return hash % 360;
}

function hashedAccent(key: string): string {
	return `hsl(${hashHue(key)} 36% 28%)`;
}

function accentForCategory(category: string): string {
	const head = categoryHead(category);
	return CATEGORY_ACCENTS[head] ?? hashedAccent(head);
}

function accentForContract(primitive: NodePrimitive): string {
	const family = swapFamily(primitive);
	return hashedAccent(family);
}

function resolvePrimitive(primitive: NodePrimitive | string): NodePrimitive | undefined {
	return typeof primitive === 'string' ? getPrimitive(primitive) : primitive;
}

/** Stable accent colour for a node primitive, or `null` when mode is `off`. */
export function nodeAccentColor(
	primitive: NodePrimitive | string,
	mode: NodeColorMode
): string | null {
	if (mode === 'off') return null;
	const resolved = resolvePrimitive(primitive);
	if (!resolved) return null;
	if (mode === 'contract') return accentForContract(resolved);
	return accentForCategory(resolved.category);
}
