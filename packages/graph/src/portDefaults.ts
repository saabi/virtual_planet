import { getPrimitive } from './registry.js';
import type { PortDefaultValue } from './dataType.js';
import type { Node, Port } from './types.js';
import type { NodePrimitive } from './primitive.js';

/** Resolve the effective default for an input port (instance override, then primitive spec). */
export function resolveInputPortDefault(
	node: Node,
	port: Port,
	primitive?: NodePrimitive | null
): PortDefaultValue | undefined {
	if (port.default !== undefined) return port.default;
	const prim = primitive ?? getPrimitive(node.primitive);
	const spec = prim?.inputs.find((candidate) => candidate.name === port.name || candidate.name === port.id);
	return spec?.default;
}

export function hasInputPortDefault(node: Node, port: Port, primitive?: NodePrimitive | null): boolean {
	return resolveInputPortDefault(node, port, primitive) !== undefined;
}
