# Brief — M9b: Multi-level editing (phased)

**Milestone:** M9b ([implementation-plan.md](../implementation-plan.md)) ·
**Packages:** `@virtual-planet/graph`, `@virtual-planet/graph-editor`,
`@virtual-planet/compiler` (CodeView only), `fe/` ·
**Depends on:** M9 ✅ ·
**Design authority:**
[editor.md](../editor.md),
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md),
[editor-and-scene-integration.md](../editor-and-scene-integration.md) ·
**Stream docs:** [graph-and-compiler.md](../graph-and-compiler.md),
[schema-and-primitives.md](../schema-and-primitives.md) ·
**Contract author:** Opus · **Recommended executor:** Composer (bulk UI/storage);
Sonnet for parser/printer/ripple logic.

## Objective

Extend the M9 editor with **multi-level synchronized editing** while keeping
**`GraphDocument` JSON the canonical save format**. Svelte markup is an export/import
projection; primitive WGSL+YAML is a separate type document edited via `CodeView`.

M9b is delivered in **four serial sub-phases** (M9b.1 → M9b.4). Each sub-phase has
its own gate; do not start N+1 until N is green.

```
Visual graph (M9)  ↔  IR JSON (canonical)  ↔  Markup export/import (bounded)
                              ↕
                    Primitive WGSL+YAML (type docs, CodeView)
```

**Out of scope for all M9b sub-phases:** sandboxed `svelte/compiler` live-document
mode, MCP/collaboration (M14), GPU preview (M10), undo/redo polish, auto-layout.

---

## M9b.1 — IR-native persistence

### Objective

Authors can **save, load, and reset** the graph document from the standalone editor.
Persistence uses existing `serializeGraph` / `deserializeGraph` from
`@virtual-planet/graph` — no new on-disk schema.

### Files

- `packages/graph-editor/src/documentStorage.ts` — localStorage adapter *(new)*
- `packages/graph-editor/src/documentStorage.test.ts` — round-trip gate *(new)*
- `packages/graph-editor/src/GraphEditor.svelte` — toolbar: New / Save / Load / Download / Upload *(update)*
- `packages/graph-editor/src/index.ts` — re-export storage helpers *(update)*

### Public surface (`documentStorage.ts`)

```ts
import type { GraphDocument } from '@virtual-planet/graph';

export const GRAPH_EDITOR_STORAGE_KEY = 'virtual-planet:graph-editor:v1';

export function loadGraphFromStorage(key?: string): GraphDocument | null;
export function saveGraphToStorage(doc: GraphDocument, key?: string): void;
export function clearGraphStorage(key?: string): void;

/** Parse uploaded JSON; throws on invalid JSON or non-object root. */
export function parseGraphFile(json: string): GraphDocument;

/** Deterministic JSON string for download (delegates serializeGraph). */
export function formatGraphForDownload(doc: GraphDocument): string;
```

Call `validateGraph` after deserialize; if invalid, surface issues in
`ValidationPanel` but still load (author can fix wiring).

### Gate

1. `serializeGraph` → `parseGraphFile` → deep equality on default preview graph.
2. `saveGraphToStorage` → `loadGraphFromStorage` round-trip in jsdom/vitest
   (mock `localStorage`).
3. Manual: `/graph-editor` → edit → reload page → graph restored from localStorage.

---

## M9b.2 — IR → markup printer + read-only MarkupView

### Objective

Add a **read-only** `MarkupView` pane showing bounded declarative markup generated
from the live IR. Establishes the grammar and deterministic printer before parsing.

### Bounded markup grammar (v1)

Root element only:

```svelte
<PlanetGraph version="1">
  <Node id="n_uv" primitive="procedural.uv" x="0" y="80" />
  <Node id="n_perlin" primitive="noise.perlin3d" x="220" y="60" />
  <Node id="n_remap" primitive="math.remap" x="460" y="80">
    <Param name="inMin" value="-1" />
    <Param name="inMax" value="1" />
    <Param name="outMin" value="0" />
    <Param name="outMax" value="1" />
  </Node>
  <Edge id="e1" from="n_uv.uv" to="n_perlin.position" />
  <Edge id="e2" from="n_perlin.value" to="n_remap.x" />
  <Output name="field" from="n_remap.value" />
  <Consumer type="preview" outputs="field" />
</PlanetGraph>
```

Rules:

- Port refs use `nodeId.portName` (matches M9 `PortRef` ids).
- Node order: stable sort by `id`. Edge order: stable sort by `id`.
- Numeric params: `value` attribute; booleans: `true`/`false`.
- No arbitrary Svelte, expressions, runes, or child components beyond the list above.
- Printer is **deterministic**: same IR → same text (sorted keys, fixed indentation).

### Files

- `packages/graph-editor/src/markup/printGraph.ts` — `printGraphMarkup(doc): string` *(new)*
- `packages/graph-editor/src/markup/printGraph.test.ts` — snapshot/identity gate *(new)*
- `packages/graph-editor/src/MarkupView.svelte` — read-only `<pre>` or textarea readonly *(new)*
- `packages/graph-editor/src/GraphEditor.svelte` — add `markup` subdivide pane *(update)*
- `packages/graph-editor/src/index.ts` — export `printGraphMarkup` *(update)*

### Gate

1. `printGraphMarkup(defaultPreviewGraph())` matches committed fixture string in test.
2. Re-printing after `serializeGraph`/`deserializeGraph` round-trip is identical.
3. Manual: edit canvas → markup pane updates live.

---

## M9b.3 — Constrained markup parser + editable MarkupView

### Objective

Parse the bounded v1 grammar back to `GraphDocument`. Enable **editable** markup
with bi-directional sync: markup edit → IR → canvas; canvas edit → markup.

### Files

- `packages/graph-editor/src/markup/parseGraphMarkup.ts` — `parseGraphMarkup(source): GraphDocument` *(new)*
- `packages/graph-editor/src/markup/parseGraphMarkup.test.ts` — round-trip gate *(new)*
- `packages/graph-editor/src/markup/roundTrip.test.ts` — `parse(print(doc))` deep-equals `doc` *(new)*
- `packages/graph-editor/src/MarkupView.svelte` — editable textarea + debounced parse *(update)*

Parser may use a lightweight XML/HTML parser or regex-backed tokenizer — **no**
`svelte/compiler` `parse` requirement. Invalid markup throws `MarkupParseError` with
line/column; show in `ValidationPanel`.

### Public surface

```ts
export class MarkupParseError extends Error {
	readonly line?: number;
	readonly column?: number;
}

export function parseGraphMarkup(source: string): GraphDocument;
```

### Gate

1. `parseGraphMarkup(printGraphMarkup(doc))` deep-equals `doc` for default preview graph.
2. Hand-edited markup matching grammar round-trips.
3. Malformed markup (unclosed tag, unknown element) throws `MarkupParseError`.
4. Manual: edit markup → canvas updates; invalid markup shows validation error.

---

## M9b.4 — CodeView + primitive ripple

### Objective

Edit **primitive type** source (WGSL + YAML frontmatter) in `CodeView`. On save,
re-run `loadWgslPrimitive`, re-register (or replace) the primitive, and ripple to
all graph instances — update port metadata, flag broken edges in `ValidationPanel`.

### Files

- `packages/graph-editor/src/CodeView.svelte` — WGSL+YAML editor for selected primitive type *(new)*
- `packages/graph-editor/src/primitiveEditor.ts` — save ripple logic *(new)*
- `packages/graph-editor/src/primitiveEditor.test.ts` — ripple gate *(new)*
- `packages/graph-editor/src/GraphEditor.svelte` — `code` pane; primitive type picker *(update)*
- `packages/graph/src/registry.ts` — `replacePrimitive(p)` or documented re-register policy *(update if needed)*

### Public surface (`primitiveEditor.ts`)

```ts
import type { GraphDocument } from '@virtual-planet/graph';
import type { LoadedWgslPrimitive } from '@virtual-planet/compiler';

export interface PrimitiveSaveResult {
	loaded: LoadedWgslPrimitive;
	/** Graph with invalid edges/nodes flagged; does not auto-delete nodes. */
	graph: GraphDocument;
	validationIssues: ValidationIssue[];
}

export function applyPrimitiveSource(
	graph: GraphDocument,
	moduleId: string,
	source: string
): PrimitiveSaveResult;
```

Use `loadWgslPrimitive` from `@virtual-planet/compiler`. Replacing a primitive must
not mutate unrelated primitives. Removing an output port marks edges
`unknown-port` / `type-mismatch` via `validateGraph`.

### Gate

1. Load default `noise.perlin3d` source from fixture; change output name in YAML →
   validation flags edges on graphs using old port.
2. Add optional param in YAML + signature → inspector shows new param on instances.
3. Manual: CodeView save → palette + nodes reflect new schema.

---

## Package boundaries

| Package | M9b role |
|---------|----------|
| `@virtual-planet/graph` | Canonical IR; `serializeGraph`; optional `replacePrimitive` |
| `@virtual-planet/graph-editor` | Storage, markup print/parse, views, ripple orchestration |
| `@virtual-planet/compiler` | `loadWgslPrimitive` only (no codegen changes) |
| `fe/` | No change unless adding route helpers |

No new workspace packages. No `svelte/compiler` runtime dependency.

---

## Done when (full M9b)

All four sub-phase gates green; `npm run check` / `npm test` green for touched
workspaces; `/graph-editor` supports save/load, live markup round-trip on declarative
subset, and primitive CodeView ripple; canonical file format remains IR JSON.

---

## Handoff

→ **M10 — runtime-webgpu** · GPU buffers/pipelines; swap CPU preview for GPU plane
consumer · graph document unchanged.

---

## Executor assignment

| Sub-phase | Model | Rationale |
|-----------|-------|-----------|
| M9b.1 | Composer | Toolbar + localStorage wiring |
| M9b.2 | Composer + Sonnet review | Printer + fixture |
| M9b.3 | Sonnet | Parser correctness + round-trip |
| M9b.4 | Sonnet | Loader integration + ripple edge cases |

Implement **serialized**: M9b.1 → M9b.2 → M9b.3 → M9b.4.
