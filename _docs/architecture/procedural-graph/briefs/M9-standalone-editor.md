# Brief — M9: Standalone graph editor (minimum vertical slice)

**Milestone:** M9 ([implementation-plan.md](../implementation-plan.md)) ·
**Packages:** `@virtual-planet/graph-editor`, `@virtual-planet/runtime-cpu`,
`@virtual-planet/graph`, `fe/` (standalone route) ·
**Depends on:** M1 ✅, M2 ✅, M3 ✅, M7 ✅, M8 ✅ ·
**Design authority:**
[editor.md](../editor.md),
[editor-and-scene-integration.md](../editor-and-scene-integration.md),
[parameter-and-form-schema.md](../parameter-and-form-schema.md),
[parameter-and-form-schema-addendum.md](../parameter-and-form-schema-addendum.md) ·
**Stream docs:** [graph-and-compiler.md](../graph-and-compiler.md),
[schema-and-primitives.md](../schema-and-primitives.md) ·
**Contract author:** Opus · **Recommended executor:** Sonnet (implementation);
Composer-class for bulk layout/deps wiring.

## Objective

Deliver the **first usable standalone graph editor**: schema-driven palette,
typed port connections with live validation, schema-driven inspector (params +
port panel), and a **CPU preview** of a scalar field on a unit plane — without
planet rendering, scene tree, GPU, markup/code views, or collaboration.

The Typed Graph IR (`GraphDocument`) stays canonical. The graph canvas uses
**`@xyflow/svelte` behind a swappable adapter**; xyflow never owns the model.

This is the **smallest end-to-end vertical slice** from
[implementation-plan.md](../implementation-plan.md): author
`procedural.uv → noise.perlin3d → math.remap`, connect ports, edit `scale`, see
the remapped field on a 2D plane preview.

## Standalone app placement

The implementation plan names `apps/graph-editor`. This monorepo's SvelteKit app
is **`fe/`** (workspaces: `fe`, `packages/*`). M9 lands the standalone shell as:

- **`fe/src/routes/graph-editor/+page.svelte`** — scene-free route; no scene tree,
  no planet viewport.
- Re-export / compose **`@virtual-planet/graph-editor`** components only.

A future split into `apps/graph-editor` is optional; do not block M9 on it.

## Files

### `@virtual-planet/graph`

- `packages/graph/src/primitive.ts` — extend `CpuEvalContext` with optional
  `procedural` sample bag *(update)*
- `packages/graph/src/primitives/uv.ts` — `procedural.uv` host-input source
  primitive *(new)*
- `packages/graph/src/primitives/index.ts` — register `uv` *(update if index exists;
  else import from graph entry)*

### `@virtual-planet/runtime-cpu`

- `packages/runtime-cpu/src/evalGraph.ts` — topological CPU graph evaluator *(new)*
- `packages/runtime-cpu/src/evalGraph.test.ts` — evaluator gate *(new)*
- `packages/runtime-cpu/src/index.ts` — re-export evaluator *(update)*

### `@virtual-planet/graph-editor`

- `packages/graph-editor/package.json` — deps: `graph`, `schema`, `subdivide`,
  `@xyflow/svelte`; peer `svelte` ^5 *(update)*
- `packages/graph-editor/src/types.ts` — editor-only binding/port UI types *(new)*
- `packages/graph-editor/src/irAdapter.ts` — `GraphDocument` ↔ xyflow nodes/edges
  *(new)*
- `packages/graph-editor/src/irAdapter.test.ts` — round-trip + patch gate *(new)*
- `packages/graph-editor/src/ParamForm.svelte` — schema-driven param editor (port
  from `SchemaForm` logic; may start as move/refactor) *(new)*
- `packages/graph-editor/src/PortBindingList.svelte` — input port rows per addendum
  *(new)*
- `packages/graph-editor/src/InspectorPanel.svelte` — `ParamForm` + `PortBindingList`
  *(new)*
- `packages/graph-editor/src/NodePalette.svelte` — from `listPrimitives()` *(new)*
- `packages/graph-editor/src/ValidationPanel.svelte` — `validateGraph` issues *(new)*
- `packages/graph-editor/src/GraphNodeView.svelte` — schema-driven node chrome + ports
  *(new)*
- `packages/graph-editor/src/GraphCanvas.svelte` — `@xyflow/svelte` wrapper *(new)*
- `packages/graph-editor/src/CpuPreviewPanel.svelte` — 2D scalar heatmap *(new)*
- `packages/graph-editor/src/GraphEditor.svelte` — subdivide shell: palette | canvas |
  inspector | validation | preview *(new)*
- `packages/graph-editor/src/index.ts` — public exports *(update)*

### `fe/`

- `fe/src/routes/graph-editor/+page.svelte` — standalone app route *(new)*
- `fe/package.json` — depend on `@virtual-planet/graph-editor` *(update)*
- `fe/src/lib/planet/components/SchemaForm.svelte` — **unchanged** in M9 unless
  `ParamForm` duplicates; prefer graph-editor owns copy/refactor

### Lockfiles

- `package-lock.json` — workspace link update *(update)*

No `compiler` codegen changes, no `runtime-webgpu`, no MCP, no scene-tree files,
no resource upload UI (M14), no `MarkupView`/`CodeView` (M9b).

## Graph additions

### `CpuEvalContext` extension

```ts
export interface CpuEvalContext {
	inputs: Record<string, CpuValue>;
	params: Record<string, number | boolean>;
	/** Per-sample procedural/host inputs for CPU preview (e.g. plane UV). */
	procedural?: Record<string, CpuValue>;
}
```

Backward compatible — existing `evalCPU` implementations ignore `procedural`.

### `procedural.uv` primitive

```ts
// id: 'procedural.uv', category: 'Input'
// inputs: [], outputs: [{ name: 'uv', dataType: 'vec2f', space: 'none' }]
// params: Type.Object({})
// wgsl: { moduleId: 'procedural.uv', entry: 'uv' }  // stub ref; GPU out of scope
// evalCPU(ctx) => ({ uv: ctx.procedural!.uv })  // throws if missing
```

## Runtime CPU — graph evaluator

In `packages/runtime-cpu/src/evalGraph.ts`:

```ts
import type { GraphDocument, PortRef } from '@virtual-planet/graph';
import type { CpuValue } from '@virtual-planet/graph';

export interface EvalGraphSample {
	/** Procedural inputs for this sample (e.g. uv: [u, v]). */
	procedural?: Record<string, CpuValue>;
}

export interface EvalGraphOptions {
	/** Optional resolver for resource ports — M9 may omit (graphs without resources). */
	resolveResource?: (portRef: PortRef) => CpuValue | undefined;
}

export function evaluateGraphOutput(
	doc: GraphDocument,
	output: PortRef,
	sample: EvalGraphSample,
	options?: EvalGraphOptions
): CpuValue;
```

**Required semantics:**

- Topologically sort nodes feeding `output`; throw `Error` on cycles or missing
  primitive/`evalCPU`.
- For each node: resolve input port values from upstream output ports (by edge);
  read `node.params` as the param bag (defaults from `Value.Create` on primitive
  schema when absent).
- Invoke `primitive.evalCPU({ inputs, params, procedural: sample.procedural })`.
- Only **scalar `f32` outputs** are required for the M9 preview gate; throw if the
  selected output is not `f32`.
- Unknown primitive id or missing `evalCPU` throws deterministically.

## Graph-editor public surface

### Pure TS (`irAdapter.ts`, `types.ts`)

```ts
import type { GraphDocument, Edge, Node, PortRef, ValidationResult } from '@virtual-planet/graph';

export interface FlowNodeData {
	nodeId: string;
	primitiveId: string;
	label: string;
}

export interface FlowEdgeData {
	edgeId: string;
}

export interface GraphEditIntent =
	| { kind: 'add-node'; primitiveId: string; position: { x: number; y: number } }
	| { kind: 'remove-node'; nodeId: string }
	| { kind: 'add-edge'; from: PortRef; to: PortRef }
	| { kind: 'remove-edge'; edgeId: string }
	| { kind: 'move-node'; nodeId: string; position: { x: number; y: number } }
	| { kind: 'set-params'; nodeId: string; params: Record<string, unknown> };

export function graphToFlow(doc: GraphDocument): {
	nodes: Array<{ id: string; position: { x: number; y: number }; data: FlowNodeData }>;
	edges: Array<{ id: string; source: string; target: string; data: FlowEdgeData }>;
};

export function applyEditIntent(doc: GraphDocument, intent: GraphEditIntent): GraphDocument;

export function validateConnection(
	doc: GraphDocument,
	from: PortRef,
	to: PortRef
): ValidationResult;
```

`applyEditIntent` is **immutable** (returns new document). `validateConnection` delegates
to `validateGraph` on a hypothetical edge (same rules as M1: type + space match).

Port identity in `PortRef`: use existing port `id` strings on `Node.inputs` /
`Node.outputs` (not display names).

### Port binding types (`types.ts`)

Per [parameter-and-form-schema-addendum.md](../parameter-and-form-schema-addendum.md):

```ts
import type { DataType, CoordinateSpace } from '@virtual-planet/graph';

export type PortBindingSource =
	| { kind: 'edge'; edgeId: string; fromNode: string; fromPort: string }
	| { kind: 'host'; inputId: string }
	| { kind: 'unconnected' };

export interface PortBindingState {
	portId: string;
	name: string;
	dataType: DataType;
	space?: CoordinateSpace;
	source: PortBindingSource;
}
```

M9 derives `PortBindingState` from `GraphDocument` edges (no `portBindings` map on
nodes yet). Resource ports show `unconnected` + disabled "Bind asset…" label (M14).
Host-sourced ports (`procedural.uv`) show read-only `host` when applicable.

### Svelte exports (`index.ts`)

```ts
export { default as GraphEditor } from './GraphEditor.svelte';
export { default as GraphCanvas } from './GraphCanvas.svelte';
export { default as InspectorPanel } from './InspectorPanel.svelte';
export { default as NodePalette } from './NodePalette.svelte';
export { default as ValidationPanel } from './ValidationPanel.svelte';
export { default as CpuPreviewPanel } from './CpuPreviewPanel.svelte';
export * from './irAdapter.js';
export * from './types.js';
```

`GraphEditor` props (conceptual):

```ts
interface GraphEditorProps {
	graph: GraphDocument;
	onchange?: (next: GraphDocument) => void;
	/** PortRef of the scalar output to preview; default first graph output. */
	previewOutput?: PortRef;
}
```

## Inspector policy (mandatory)

1. **`ParamForm`** — walks `fields(primitive.params)`; `Value.Check` before
   `set-params` intent; sections from `sectionsOf(primitive.params)`.
2. **`PortBindingList`** — one row per input port; shows connection state; **no**
   upload widgets; **no** scalar editors for ports.
3. **No handwritten per-primitive inspectors.**

## Canvas adapter policy

- `@xyflow/svelte` is the only xyflow import site (`GraphCanvas.svelte`).
- Custom node type renders `GraphNodeView` with port handles typed by `dataType` +
  `space`.
- Connection drag calls `validateConnection`; reject invalid connects **before**
  `add-edge` intent (visual feedback: disallowed cursor or toast).
- Pan/zoom/minimap: use xyflow built-ins where possible.

## CPU preview panel

- Fixed grid (default **64×64**) over `u,v ∈ [0,1]`.
- For each cell, `evaluateGraphOutput(doc, previewOutput, { procedural: { uv: [u, v] } })`.
- Map scalar to grayscale canvas (`CpuPreviewPanel`).
- Recompute when `graph` or `previewOutput` changes (debounce optional).

## Acceptance gate

### `runtime-cpu` — `evalGraph.test.ts`

1. Linear graph `procedural.uv → math.remap` with known params: sample `uv=[0.5,0.5]`
   matches hand-computed `remap(perlin(...), ...)`.
2. Cycle detection throws.
3. Type-mismatched edge in doc throws at eval time (or validate first — eval throws
   if invalid doc passed).

### `graph-editor` — `irAdapter.test.ts`

1. `graphToFlow` → `applyEditIntent` add/remove node round-trips node count.
2. `validateConnection` rejects `f32 → vec3f` and mismatched `space`.
3. `validateConnection` accepts valid `vec2f → vec2f` edge.

### Manual / Playwright (fe route)

At `/graph-editor`:

1. Add `procedural.uv`, `noise.perlin3d`, `math.remap` from palette; connect
   `uv → position` (or perlin input port name), perlin scalar output → remap `x`.
2. Invalid connection (e.g. `bool` to `f32` if exposed) is rejected live.
3. Select `math.remap`; change a param; preview heatmap updates.
4. `ValidationPanel` lists issues after deleting a wired node.

Run:

```sh
npm run check -w @virtual-planet/graph
npm test -w @virtual-planet/graph
npm run check -w @virtual-planet/runtime-cpu
npm test -w @virtual-planet/runtime-cpu
npm run check -w @virtual-planet/graph-editor
npm test -w @virtual-planet/graph-editor
cd fe && npm run check
```

## Out of scope

- `MarkupView`, `CodeView`, IR→Svelte printer/parser (M9b).
- Undo/redo, clipboard, auto-layout, minimap polish (may stub).
- Resource asset picker / upload / `GraphDocument.resources` authoring (M14).
- GPU preview, `runtime-webgpu`, WGSL compile in browser.
- Scene tree, body linking, `<GraphEditor>` embed in `/scene` (M16).
- Full `SchemaForm` feature parity (log slider, path picker) — incremental OK.
- `svelte/compiler` at runtime.

## Done when

All gate tests green; `/graph-editor` route loads; manual slice works; no new public
API beyond this brief; `npm run check` / `npm test` green for touched workspaces;
inspector uses TypeBox params only; resource ports are not in `ParamForm`.

## Handoff

→ **M9b — multi-level editing** · IR-native save, markup printer/parser,
primitive code ripple · after M9 vertical slice is stable.

## Implementation notes for delegates

| Workstream | Model | Rationale |
|------------|-------|-----------|
| `evalGraph.ts` + tests | Sonnet | Graph traversal + edge cases |
| `irAdapter.ts` + tests | Sonnet | IR invariants |
| Svelte components + xyflow | Svelte-capable Sonnet / svelte-file-editor | Svelte 5 runes, xyflow API |
| `fe` route + package.json deps | Composer / fast | Bulk wiring |
| Section chrome port from `fe/` | Composer | Mechanical copy of layout patterns |

Import primitives in the standalone route:

```ts
import '@virtual-planet/graph/primitives'; // or explicit side-effect imports
```

Ensure `listPrimitives()` includes `procedural.uv` and M2 math/noise primitives.
