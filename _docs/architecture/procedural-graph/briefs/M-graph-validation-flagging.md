# Brief — Flag incomplete / invalid graphs

**Type:** core + editor (Tier 1, functional pipeline) · **Packages:**
`@virtual-planet/graph` (validation rules), `@virtual-planet/graph-editor`
(ValidationPanel + canvas highlight) · **Depends on:** `validateGraph` ✅ (type/space/
resource mismatches) · **Design authority:**
[graph-and-compiler.md](../graph-and-compiler.md), [editor.md](../editor.md) ·
**Contract author:** Opus · **Recommended executor:** Cursor.

## Objective

Make the editor honestly flag **incomplete** and **invalid** graphs. Today `validateGraph`
catches type/space/resource **edge** mismatches, but not **incompleteness** — a node with
an unconnected required input, a consumer whose output isn't reachable, an unresolved
primitive, or a dangling node compiles to broken/empty WGSL silently. Surface all of it.

## Part 1 — Validation rules (`graph`)

Extend `validateGraph` (additive `ValidationIssue` kinds):

- **`unconnected-input`** — a node input port that is **required** (no default, not a
  promotable param with a literal) has no incoming edge. (Use the primitive's port + param
  metadata to decide "required".)
- **`unresolved-primitive`** — a node references a `primitive`/group id not in the registry.
- **`no-output-path`** — a declared `GraphOutput` / consumer output has no path back to a
  source (or references a missing node/port).
- **`dangling-node`** — a node that reaches no output/consumer (informational/warning, not
  an error — authors build incrementally).

Keep severity: errors (block compile) vs warnings (dangling). `validateGraph` returns them
alongside the existing mismatch issues; `ok` is false only on errors.

## Part 2 — Editor surfacing (`graph-editor`)

- `ValidationPanel` lists all issues grouped by severity, each linking to its node/edge.
- The canvas (`GraphNodeView`/`GraphCanvas`) **highlights** offending nodes/ports/edges
  (e.g. red port for `unconnected-input`, red node for `unresolved-primitive`).
- The compiled-WGSL view + preview show "graph incomplete: N errors" instead of a crash
  (ties to [M-compiled-wgsl-view](./M-compiled-wgsl-view.md)).

Keep `graph-editor` scene-free.

## Gate

1. **Headless (`graph`):** a graph with a node missing a required input → `unconnected-input`
   issue, `ok=false`; an unknown primitive id → `unresolved-primitive`; an output referencing
   a missing node → `no-output-path`; a fully-wired valid graph → `ok=true` with no errors; a
   node wired to nothing → `dangling-node` **warning** but `ok=true`.
2. **Visual ⚠:** loading an incomplete graph highlights the broken node/port and lists the
   issue; completing the wire clears it. Screenshot.
3. `npm run check`/`test -w @virtual-planet/{graph,graph-editor}` green (existing validation
   tests stay green); `apps/graph-editor` builds.

## Out of scope

Auto-fix / suggestions; cycle detection in the *field* graph (separate from the pass-graph
cycle check); WGSL-level semantic validation (the compiler/device handles that). **No new
public API beyond the issue kinds + the panel/highlight wiring.**

## Handoff

→ Incomplete graphs are visible and non-fatal — the editor guides authoring instead of
silently producing broken shaders (Tier 1).
