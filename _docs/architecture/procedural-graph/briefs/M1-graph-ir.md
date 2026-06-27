# Brief — M1: Graph IR

**Milestone:** M1 ([implementation-plan.md](../implementation-plan.md)) ·
**Package:** `@virtual-planet/graph` · **Depends on:** M0 (done) ·
**Stream doc:** [graph-and-compiler.md](../graph-and-compiler.md) (typed graph +
coordinate-space ports) · **Contract author:** Opus · **Recommended executor:**
Sonnet or Codex.

## Objective

Define the Typed Graph IR as plain-data types + a semantic validator + stable
serialization, so every later milestone builds on a fixed foundation. The two
correctness rules that matter most (from the stream doc): **reject type-mismatched
edges** and **reject coordinate-space-mismatched edges**.

## Files

- `packages/graph/src/types.ts` — IR types *(new)*
- `packages/graph/src/validate.ts` — `validateGraph` *(new)*
- `packages/graph/src/serialize.ts` — `serializeGraph` / `deserializeGraph` *(new)*
- `packages/graph/src/index.ts` — re-export the above *(update; keep `GRAPH_PACKAGE`)*
- `packages/graph/src/graph.test.ts` — the gate *(new; replaces the M0 scaffold test)*

No dependency changes needed — the validator is hand-written. (Structural
validation via `@virtual-planet/schema` / TypeBox is a later milestone; do **not**
add it here.)

## Public surface (`types.ts`)

```ts
export type DataType = 'f32' | 'vec2f' | 'vec3f' | 'vec4f' | 'bool';

/** Coordinate space for spatial ports (see graph-and-compiler.md). 'none' = not spatial. */
export type CoordinateSpace =
	| 'none'
	| 'world_dir'
	| 'body_dir'
	| 'world_pos'
	| 'body_pos'
	| 'ideal_fragment_body_dir'
	| 'height_meters'
	| 'world_radius_meters'
	| 'scale_ctx';

export interface Port {
	id: string;
	name: string;
	direction: 'in' | 'out';
	dataType: DataType;
	space?: CoordinateSpace; // defaults to 'none'
}

export interface Node {
	id: string;
	primitive: string; // primitive id, e.g. 'noise.perlin3d'
	params?: Record<string, unknown>;
	inputs: Port[];
	outputs: Port[];
	position?: { x: number; y: number }; // editor-only metadata
}

export interface PortRef {
	node: string;
	port: string;
}

export interface Edge {
	id: string;
	from: PortRef; // an output port
	to: PortRef; // an input port
}

export interface GraphOutput {
	name: string;
	from: PortRef;
}

export interface ProceduralConsumer {
	type: string;
	outputs: string[];
}

export interface GraphDocument {
	version: string;
	nodes: Node[];
	edges: Edge[];
	outputs: GraphOutput[];
	consumers: ProceduralConsumer[];
}
```

## Validator (`validate.ts`)

```ts
export type ValidationIssue =
	| { kind: 'unknown-node'; edge: string; node: string }
	| { kind: 'unknown-port'; edge: string; node: string; port: string }
	| { kind: 'bad-direction'; edge: string; end: 'from' | 'to' }
	| { kind: 'type-mismatch'; edge: string; from: DataType; to: DataType }
	| { kind: 'space-mismatch'; edge: string; from: CoordinateSpace; to: CoordinateSpace };

export interface ValidationResult {
	ok: boolean;
	issues: ValidationIssue[];
}

export function validateGraph(doc: GraphDocument): ValidationResult;
```

Rules, per edge:

1. `from` must resolve to an existing node and an **output** port of it; `to` to an
   existing node and an **input** port. A port found on the wrong side →
   `bad-direction`; a missing node → `unknown-node`; a missing port → `unknown-port`.
2. `type-mismatch` if `from.dataType !== to.dataType`.
3. `space-mismatch` if **both** ports have a space other than `'none'` and the spaces
   differ. (Transform nodes that legitimately bridge spaces arrive in a later
   milestone; for M1, differing non-`none` spaces are rejected.)
4. `ok = issues.length === 0`.

## Serialization (`serialize.ts`)

```ts
export function serializeGraph(doc: GraphDocument): string;
export function deserializeGraph(json: string): GraphDocument;
```

- `serializeGraph` produces **deterministic** JSON: object keys sorted recursively,
  array order preserved (stable diffs — see the "stable printers" rule in the stream
  doc). Use tab indentation to match repo style.
- `deserializeGraph` parses back to a `GraphDocument`.
- Invariant: `deserializeGraph(serializeGraph(doc))` deep-equals `doc`.

## The gate (`graph.test.ts`) — must pass

```ts
import { describe, expect, it } from 'vitest';
import type { CoordinateSpace, DataType, GraphDocument } from './types.js';
import { validateGraph } from './validate.js';
import { deserializeGraph, serializeGraph } from './serialize.js';

function twoNodeGraph(opts?: {
	toType?: DataType;
	fromSpace?: CoordinateSpace;
	toSpace?: CoordinateSpace;
}): GraphDocument {
	return {
		version: '1',
		nodes: [
			{
				id: 'n_noise',
				primitive: 'noise.perlin3d',
				inputs: [{ id: 'position', name: 'position', direction: 'in', dataType: 'vec3f', space: 'body_dir' }],
				outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32', space: opts?.fromSpace ?? 'none' }],
			},
			{
				id: 'n_remap',
				primitive: 'math.remap',
				inputs: [{ id: 'x', name: 'x', direction: 'in', dataType: opts?.toType ?? 'f32', space: opts?.toSpace ?? 'none' }],
				outputs: [{ id: 'out', name: 'out', direction: 'out', dataType: 'f32' }],
			},
		],
		edges: [{ id: 'e1', from: { node: 'n_noise', port: 'value' }, to: { node: 'n_remap', port: 'x' } }],
		outputs: [{ name: 'height', from: { node: 'n_remap', port: 'out' } }],
		consumers: [{ type: 'terrain-mesh', outputs: ['height'] }],
	};
}

describe('@virtual-planet/graph IR', () => {
	it('round-trips through serialize/deserialize', () => {
		const doc = twoNodeGraph();
		expect(deserializeGraph(serializeGraph(doc))).toEqual(doc);
	});

	it('serialization is deterministic', () => {
		expect(serializeGraph(twoNodeGraph())).toBe(serializeGraph(twoNodeGraph()));
	});

	it('accepts a type- and space-matching edge', () => {
		expect(validateGraph(twoNodeGraph()).ok).toBe(true);
	});

	it('rejects a type-mismatched edge', () => {
		const res = validateGraph(twoNodeGraph({ toType: 'vec3f' }));
		expect(res.ok).toBe(false);
		expect(res.issues.some((i) => i.kind === 'type-mismatch')).toBe(true);
	});

	it('rejects a coordinate-space-mismatched edge', () => {
		const res = validateGraph(twoNodeGraph({ fromSpace: 'world_dir', toSpace: 'body_dir' }));
		expect(res.ok).toBe(false);
		expect(res.issues.some((i) => i.kind === 'space-mismatch')).toBe(true);
	});
});
```

## Out of scope

No primitive registration (M2), no WGSL/emit, no compiler/slicing, no transform-node
space bridging, no `@virtual-planet/schema` structural validation, no editor. **No
new public exports beyond those listed above.**

## Done when

`npm run check -w @virtual-planet/graph` and `npm test -w @virtual-planet/graph` are
green, the M0 placeholder test is replaced by `graph.test.ts`, and the public surface
matches this brief exactly.

## Handoff

→ **M2 — Primitive registration + noise/math primitives with CPU evaluators** ·
executor: **Opus pins the `NodePrimitive` / `registerPrimitive` contract first**,
then Sonnet implements the registry and Haiku fills individual primitives · why: with
the IR and ports fixed, primitives can be defined and unit-tested against `evalCPU`
on the now-stable types.
