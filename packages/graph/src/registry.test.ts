import { describe, expect, it } from 'vitest';
import { getPrimitive, listPrimitives, replacePrimitive, type NodePrimitive } from '@world-lab/graph';

describe('@world-lab/graph replacePrimitive', () => {
	it('replaces an existing registration without changing list order', () => {
		const before = getPrimitive('math.clamp')!;
		const replacement: NodePrimitive = {
			...before,
			category: 'math-edited'
		};

		replacePrimitive(replacement);

		expect(getPrimitive('math.clamp')?.category).toBe('math-edited');
		expect(listPrimitives().map((primitive) => primitive.id)).toContain('math.clamp');

		replacePrimitive(before);
	});
});
