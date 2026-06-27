# Brief — M9c: Editor UX polish (delete + duplicate)

**Milestone:** M9c (optional parallel track) ·
**Package:** `@virtual-planet/graph-editor` ·
**Depends on:** M9 ✅ ( `applyEditIntent` ) ·
**Design authority:** [editor.md](../editor.md) ·
**Contract author:** Opus · **Recommended executor:** Composer (UI wiring); Sonnet (clipboard IR).

## Objective

Ship **everyday canvas editing** that M9 deferred: delete selection with sensible
feedback, and **lightweight duplicate** (copy/paste one node) without building a
full undo stack or multi-select subgraph clipboard yet.

Runs **in parallel with M10** (or between M10 sub-phases) — does not block GPU work.
Serialized **M9c.1 → M9c.2** only; do not start M9c.2 until M9c.1 gate is green.

## Why now

- `remove-node` / `remove-edge` IR intents exist and are tested; no UI calls them.
- M9 listed undo/redo/clipboard as out of scope; authors still need delete/duplicate
  for daily graph editing.
- Scope stays small: **no undo**, **no multi-node subgraph paste**, **no system
  clipboard** requirement in v1.

---

## M9c.1 — Delete selection

### UX

| Action | Behavior |
|--------|----------|
| **Delete / Backspace** | With a **node** selected → remove node + incident edges; clear selection. |
| **Delete / Backspace** | With an **edge** selected → `remove-edge` only. |
| **Delete / Backspace** | Nothing selected → no-op. |
| **Validation** | After delete, `ValidationPanel` updates (orphaned outputs may warn — OK). |

Optional chrome (pick one, keep minimal):

- Toolbar **Delete** button (disabled when nothing selected), or
- xyflow context menu entry “Delete”.

Do **not** add confirmation modals for v1 — graphs are local/session docs; **New**
already resets. Undo deferred to M9c+.

### Files

- `packages/graph-editor/src/GraphCanvas.svelte` — edge selection + keyboard handler *(update)*
- `packages/graph-editor/src/GraphEditor.svelte` — wire delete callback / toolbar *(update)*
- `packages/graph-editor/src/irAdapter.test.ts` — remove-edge gate if missing *(update)*

### Gate

1. `applyEditIntent(remove-node)` still passes existing tests.
2. Manual: select perlin → Delete → node and its edges gone; preview/validation update.
3. Manual: select edge → Delete → edge gone; nodes remain.

---

## M9c.2 — Duplicate node (internal clipboard)

### UX

| Action | Behavior |
|--------|----------|
| **Ctrl+D** or **Ctrl+C then Ctrl+V** | Duplicate **selected node** (if any). |
| **Duplicate** | New node id; same `primitive` + `params`; **position + (24, 24)** offset (or paste-at-pointer later). |
| **Edges** | **Not** copied — author rewires. Keeps id remapping trivial. |
| **Selection** | Select the new node after duplicate. |

Internal clipboard only (in-memory `GraphNodeClipboard | null` in `GraphEditor` or
`clipboard.ts`) — **no** `navigator.clipboard` in v1 (avoids async permissions and
cross-tab scope creep).

### IR surface (`irAdapter.ts`)

```ts
export interface GraphNodeClipboard {
	primitiveId: string;
	params?: Record<string, unknown>;
}

export type GraphEditIntent =
	| /* existing */
	| { kind: 'duplicate-node'; sourceNodeId: string; position: { x: number; y: number } };

/** Copy payload from an existing node (throws if missing). */
export function copyNodeToClipboard(doc: GraphDocument, nodeId: string): GraphNodeClipboard;

/** applyEditIntent handles duplicate-node: createNode + merge params from source. */
```

Alternative: single intent `{ kind: 'paste-node'; clipboard; position }` without
separate copy helper — either is fine if gated.

### Files

- `packages/graph-editor/src/clipboard.ts` — `copyNodeToClipboard`, types *(new)*
- `packages/graph-editor/src/clipboard.test.ts` — param preservation gate *(new)*
- `packages/graph-editor/src/irAdapter.ts` — `duplicate-node` intent *(update)*
- `packages/graph-editor/src/GraphEditor.svelte` — Ctrl+D / Ctrl+C/V handlers *(update)*

### Gate

1. Duplicate `math.remap` with non-default params → pasted node matches params; new id.
2. Manual: duplicate → drag → connect; preview works.
3. No new edges created by duplicate alone.

---

## Explicitly deferred (not M9c)

| Feature | Rationale | Likely home |
|---------|-----------|-------------|
| Undo / redo | Needs command stack + coalescing | M14+ or dedicated polish |
| Multi-select | xyflow + IR batch intents | After M9c.2 demand |
| Subgraph copy (nodes + internal edges) | Id remapping + bounds | Post multi-select |
| System clipboard / cross-tab | Permissions, format versioning | Optional M9c.3+ |
| Cut | Same as copy + delete once undo exists | With undo |
| Delete graph **output** / consumer rows | Inspector/output panel not built | M12+ consumers |

---

## Done when (full M9c)

M9c.1 + M9c.2 gates green; `npm test -w @virtual-planet/graph-editor`; manual
delete + duplicate on `/graph-editor`; no change to Graph IR schema or persistence
format.

---

## Handoff

→ Resume **M10** GPU track (or **M10.3** editor GPU preview) — graph document unchanged.

---

## Executor assignment

| Phase | Executor | Notes |
|-------|----------|-------|
| M9c.1 | Composer | Keyboard + xyflow edge select |
| M9c.2 | Composer + Sonnet review | duplicate-node intent + tests |

Implement **serialized**: M9c.1 → M9c.2. May run while M10.1–M10.2 proceed in another
workstream if the tree is clean and gates stay green.
