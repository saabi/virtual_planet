import type { NodePrimitive, PortSpec } from './primitive.js';
import { listPrimitives, getPrimitive } from './registry.js';

/**
 * Compute a normalized mechanical contract string from a primitive's port signature.
 * Two primitives with the same contract are mechanically interchangeable — edges
 * are preservable when swapping one for the other.
 *
 * Format: `<direction><portCount>:<dataType>,<dataType>-><dataType>,<dataType>`
 * Example: `bin:f32,f32->f32` for binary f32 ops (add/multiply/min/max).
 */
export function contractOf(primitive: NodePrimitive): string {
	const inputs = formatPorts(primitive.inputs);
	const outputs = formatPorts(primitive.outputs);
	return `${inputs}->${outputs}`;
}

function formatPorts(ports: PortSpec[]): string {
	return ports.map((p) => {
		const space = p.space && p.space !== 'none' ? `@${p.space}` : '';
		return `${p.dataType}${space}`;
	}).join(',');
}

/**
 * Return the swap-family key for a primitive. If `role` metadata is set, that is
 * the family; otherwise the mechanical contract is used. All primitives sharing a
 * swap family can be swapped in-place with edges preserved (by contract) or with
 * primary-edge preservation (by role).
 */
export function swapFamily(primitive: NodePrimitive): string {
	return primitive.metadata?.role ?? contractOf(primitive);
}

/**
 * List all registered primitives that share the same swap family as the
 * given primitive (by id). Returns an empty array if the id is not registered.
 */
export function listSwapFamily(id: string): NodePrimitive[] {
	const target = getPrimitive(id);
	if (!target) return [];
	const family = swapFamily(target);
	return listPrimitives().filter((p) => swapFamily(p) === family);
}
