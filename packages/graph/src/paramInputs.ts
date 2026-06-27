import { fields, type SchemaField } from '@virtual-planet/schema';
import type { NodePrimitive, PortSpec } from './primitive.js';
import type { DataType, Edge, Node, PortRef } from './types.js';

/** Schema annotation marking a param as a compile-time constant — NOT promotable to an
 *  input port (loop/octave counts, array sizes, code-path selectors). Set on a param's
 *  TypeBox options, e.g. `Type.Integer({ 'x-const': true })`. */
export const X_CONST = 'x-const';

function isPromotable(field: SchemaField): boolean {
	if ((field.schema as Record<string, unknown>)[X_CONST] === true) return false;
	// Scalar params are wireable; objects/arrays/enums are not (this round).
	return field.kind === 'number' || field.kind === 'integer' || field.kind === 'boolean';
}

function paramDataType(field: SchemaField): DataType {
	return field.kind === 'boolean' ? 'bool' : 'f32';
}

/** Names of a primitive's params that may be promoted to input ports (all scalar params
 *  except those marked `x-const`). */
export function promotableParams(primitive: NodePrimitive): string[] {
	return fields(primitive.params).filter(isPromotable).map((f) => f.key);
}

/** Synthetic input ports for a primitive's promotable params — added to a node so edges can
 *  drive a param instead of (or in addition to) the form literal. */
export function paramInputPorts(primitive: NodePrimitive): PortSpec[] {
	return fields(primitive.params)
		.filter(isPromotable)
		.map((field) => ({ name: field.key, dataType: paramDataType(field) }));
}

/** Where a param's value comes from this evaluation. */
export type ParamBinding =
	| { kind: 'edge'; from: PortRef }
	| { kind: 'literal'; value: number | boolean }
	| { kind: 'default' };

/**
 * Resolve each promotable param's source, with precedence **connected edge > stored literal
 * > schema default**. `incomingEdges` are edges whose `to.node === node.id`; a param is
 * edge-driven when an incoming edge targets the input port named for that param.
 */
export function resolveParamBindings(
	node: Node,
	primitive: NodePrimitive,
	incomingEdges: readonly Edge[],
): Record<string, ParamBinding> {
	const out: Record<string, ParamBinding> = {};
	for (const field of fields(primitive.params)) {
		if (!isPromotable(field)) continue;
		const edge = incomingEdges.find((e) => e.to.node === node.id && e.to.port === field.key);
		if (edge) {
			out[field.key] = { kind: 'edge', from: edge.from };
			continue;
		}
		const literal = node.params?.[field.key];
		if (typeof literal === 'number' || typeof literal === 'boolean') {
			out[field.key] = { kind: 'literal', value: literal };
			continue;
		}
		const def = (field.schema as { default?: unknown }).default;
		if (typeof def === 'number' || typeof def === 'boolean') {
			out[field.key] = { kind: 'literal', value: def };
			continue;
		}
		out[field.key] = { kind: 'default' };
	}
	return out;
}
