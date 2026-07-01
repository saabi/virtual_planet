# Brief — Guarantee unique node/edge ids (mint + dedupe + validate)

**Type:** 🔴 correctness (editor mints colliding ids) · **Packages:**
`@virtual-planet/graph-editor` (`irAdapter.ts`, `documentStorage.ts`), `@virtual-planet/graph`
(validation), issue formatters (`graph-editor`, `mcp-server`) · **Depends on:** nothing ·
**Design authority:** `graph-and-compiler.md` · **Contract author:** Opus · **Recommended
executor:** Cursor · **Status:** DONE `44d6141`

## Problem

The editor produces graphs with **duplicate node and edge ids** (observed: two nodes both
`n_noise_worley2d_4`, edges `e_2`/`e_7`/`e_8` each twice). Root cause — `irAdapter.ts`:

```ts
let nodeCounter = 0; let edgeCounter = 0;              // module-global, reset per page load
function nextNodeId(p) { nodeCounter += 1; return `n_${p.replace(/\./g,'_')}_${nodeCounter}`; }
function nextEdgeId() { edgeCounter += 1; return `e_${edgeCounter}`; }
```

These counters are **never seeded from the loaded document**. Load a graph containing
`…_1…_14`, then add a node → `nextNodeId` returns `…_1` again → **collision**. Duplicate/paste
and file import compound it. Duplicate ids cause silent first-wins resolution (`doc.nodes.find`,
`incoming()`), broken edge removal/selection, and the ambiguity you've been debugging. Unique
ids are a core invariant — enforce it at mint, at load, and in validation.

## Fix

1. **Document-aware minting (`irAdapter.ts`):** replace the module-global counters with id
   generation that is **guaranteed unique against the current `doc`**. `applyEditIntent`
   already receives `doc` — for `add-node`, `duplicate-node`, `add-connected-node`,
   `add-edge`, derive the id from the doc's existing ids (max suffix + 1, or loop until not in
   the id set). No id already present in `doc.nodes`/`doc.edges` may be reused.
2. **Duplicate/paste re-ids (`irAdapter.ts`):** `duplicate-node` (and any paste path) mints a
   **fresh** node id and rewrites the pasted node's edges to the new id — never carries source
   ids.
3. **Dedupe on load/import (`documentStorage.ts` `parseGraphFile`):** when a loaded/uploaded
   graph contains duplicate node or edge ids, **re-id the duplicates** (and remap their edge
   endpoints) so the loaded doc is collision-free. Don't silently keep duplicates.
4. **Validation rule (`graph/validate.ts`):** add `duplicate-id` (node and edge) as an error.
   > **Exhaustive-switch gotcha:** add the `duplicate-id` case to `mcp-server/src/index.ts`
   > `formatValidationIssue` **and** `graph-editor/src/graphValidation.ts`, or `check` fails.

## Gate

1. **irAdapter:** after loading a graph with ids up to `…_N`, `add-node`/`duplicate-node`
   produce ids **not** already present; `duplicate-node` remaps the clone's edges to the new
   id. Test.
2. **documentStorage:** `parseGraphFile` on a graph with duplicate node+edge ids returns a doc
   with all-unique ids (duplicates re-id'd, edges remapped) that passes `validateGraph`. Test.
3. **graph:** `validateGraph` reports `duplicate-id` for a doc with a repeated node or edge id.
   Test.
4. `check` **and** `test` green for `graph`, `graph-editor`, `mcp-server`; keep prior tests green.
5. **Visual ⚠:** load a graph, add/duplicate several nodes → no id collisions; the reported
   two-target graph loads clean. Screenshot.

## Out of scope

Human-readable/stable id schemes (counter-suffixed is fine); cross-session id persistence
beyond the document; renaming ids in the UI.

## Handoff

→ Node/edge ids are unique by construction (mint), on load (dedupe), and by validation — closing
the silent first-wins class of bugs. Complements single-fan-in (`9e46041`).
