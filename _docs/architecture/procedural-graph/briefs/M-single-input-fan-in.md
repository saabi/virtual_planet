# Brief — Enforce single fan-in on non-list input ports

**Type:** 🔴 correctness (invalid graph is constructible) · **Packages:**
`@virtual-planet/graph` (validation rule), `@virtual-planet/graph-editor` (add-edge replace +
issue formatting), `@virtual-planet/mcp-server` (issue formatting) · **Depends on:** nothing ·
**Design authority:** `graph-and-compiler.md` · **Contract author:** Opus · **Recommended
executor:** Cursor.

## Problem

Two `stage.fragment.texture` outputs can be wired into **one** `target.display.color` input
(screenshot) — an input port accepting **multiple incoming edges**. A non-list input has
fan-in **one**; the runner's `incoming()` does `edges.find(...)` and silently takes the first,
ignoring the rest → ambiguous, order-dependent behavior. Nothing prevents or flags it:

- `irAdapter.ts` `add-edge` (line ~290) just **appends** the edge — no replace/dedup.
- `validateConnection` checks type/direction/space, **not** whether the target input is
  already occupied.
- `validateGraph` has **no** "multiple incoming edges to one input" rule.

Fix both the connect-time UX (replace) and the validation net (flag existing docs).

## Part 1 — Connect replaces an occupied input (`irAdapter.ts` `add-edge`)

Before appending, if the **target** input port is **non-list** and already has an incoming
edge, **remove** that edge, then add the new one (standard node-editor replace semantics).
**List inputs** (`dataType.startsWith('list<')`) keep accepting multiple edges — do not dedup
those. Determine list-ness from the target node's port `dataType`. (`GraphCanvas.onConnect`
already routes through this intent, so xyflow re-renders from the doc with the old edge gone.)

## Part 2 — Validation rule (`@virtual-planet/graph` `validateGraph`)

Add a structural rule + issue kind: a **non-list** input port with **>1** incoming edge is an
error.

```ts
| { kind: 'multiple-inputs'; node: string; port: string; count: number }
```

`validateGraph` already resolves each edge's `toPort`; group edges by `(to.node, to.port)`,
and for non-list target ports with count > 1 emit `multiple-inputs`. This catches graphs from
upload/markup/programmatic construction that didn't go through `add-edge`.

> **Exhaustive-switch gotcha (bit us before):** extending `ValidationIssue` breaks every
> exhaustive `switch` on `issue.kind` — add the `multiple-inputs` case to
> `mcp-server/src/index.ts` `formatValidationIssue` **and** `graph-editor/src/graphValidation.ts`,
> or `check` (not `test`) fails. Verify with `npm run check` on both.

## Gate

1. **graph:** a doc with two edges into one non-list input → `validateGraph` reports
   `multiple-inputs` (error); a `list<...>` input with two incoming edges → **no** error. Test.
2. **irAdapter:** `add-edge` into an already-connected non-list input yields exactly **one**
   incoming edge on that port (the new one); into a `list<...>` input keeps both. Test.
3. `check` **and** `test` green for `graph`, `graph-editor`, `mcp-server` (the exhaustive
   switches); keep all prior tests green.
4. **Visual ⚠:** wiring a second texture into `target.display.color` replaces the first — only
   one connection remains. Screenshot.

## Out of scope

Fan-**out** limits (one output may feed many inputs — that's fine); multi-edge semantics for
list inputs (unchanged); a "port already connected" cursor affordance during drag (replace on
drop is enough).

## Handoff

→ Non-list inputs hold at most one connection — replaced on reconnect, flagged if a loaded
graph violates it. Removes an ambiguous, order-dependent class of invalid graphs.
