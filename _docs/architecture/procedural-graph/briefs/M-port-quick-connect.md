# Brief — Port quick-connect: right-click a port to add a compatible connected node

**Type:** editor UX · **Packages:** `@virtual-planet/graph` (compatible-primitive helpers),
`@virtual-planet/graph-editor` (port menu + add-connected-node intent) · **Depends on:**
canonical data types ✅ (`compatibleDataTypes` reliable), port handles ✅ (`portHandles.ts`) ·
**Design authority:** `editor.md` · **Contract author:** Opus · **Recommended executor:**
Cursor.

## Goal

Right-clicking a **port** opens a searchable menu of nodes that can connect to it, filtered
by type; picking one **adds that node already wired**:

- **Output port** → menu of **consumers** (primitives with a compatible **input**); select →
  new node added, `sourceOutput → newNode.firstCompatibleInput` wired.
- **Input port** → menu of **producers** (primitives with a compatible **output**); select →
  new node added, `newNode.firstCompatibleOutput → sourceInput` wired.

It's the port-anchored, inverse-filtered sibling of the palette/swap menus.

## Part 1 — Compatible-primitive helpers (`@virtual-planet/graph`)

Alongside `listSwapFamily`, using `compatibleDataTypes` (directional):

```ts
export interface PortMatch { primitive: NodePrimitive; portName: string; } // first compatible port
// primitives with an input accepting `dataType` (for an output port right-click)
export function compatibleConsumers(dataType: DataType): PortMatch[];   // compatibleDataTypes(dataType, input.dataType)
// primitives with an output feeding `dataType` (for an input port right-click)
export function compatibleProducers(dataType: DataType): PortMatch[];   // compatibleDataTypes(output.dataType, dataType)
```

`portName` is the **first** compatible port on the candidate (deterministic order). Mind the
direction of `compatibleDataTypes(from, to)` — it encodes the vec2f→vec3f promotion and
`list<T>` rules, so pass args in the right order for each case.

## Part 2 — `add-connected-node` edit intent (`irAdapter.ts`)

One atomic intent (the edge needs the node id that `add-node` generates):

```ts
| { kind: 'add-connected-node'; primitiveId: string; position: {x:number;y:number};
    source: PortRef; sourceDirection: 'in' | 'out' }
```

Handler: instantiate the node (reuse the `add-node` path), resolve the candidate's first
compatible port (`compatibleConsumers`/`Producers` re-checked against the concrete port), then
add the edge in the correct orientation — `sourceDirection: 'out'` ⇒ `from = source`,
`to = {newNode, matchedInput}`; `'in'` ⇒ `from = {newNode, matchedOutput}`, `to = source`.
The resulting graph must pass `validateGraph` (valid edge, right directions).

## Part 3 — Port right-click menu (`GraphNodeView.svelte` + new `PortConnectMenu.svelte`)

- `oncontextmenu` on each input/output port row (`preventDefault` to suppress the browser
  menu) opens `PortConnectMenu` anchored at the port, seeded with `compatibleConsumers(t)` for
  an output port or `compatibleProducers(t)` for an input port (`t` = the port's `dataType`).
- The menu is a searchable list — **reuse `filterPrimitives`** + the help-tooltip + the
  click-outside/Escape dismissal established for the swap menu (share a list component if
  clean; do not block on `NodeSwapMenu` edits in flight).
- Select → dispatch `add-connected-node` with a placement **offset** from the source node
  (output → to the right, input → to the left) so the new node doesn't overlap. Close menu.

## Gate

1. **graph:** `compatibleConsumers`/`compatibleProducers` return the right primitives for a
   sample type (e.g. a `vec4f` output lists `vector.vec4f.x`/math ops taking `vec4f`; an `f32`
   input lists `constant.f32`/scalar producers), respecting direction + promotion rules. Tests.
2. **irAdapter:** `add-connected-node` adds the node and a **valid** edge in the correct
   orientation for both an output-port source and an input-port source; result passes
   `validateGraph`. Test.
3. `check` **and** `test` green for both packages; keep all prior tests green.
4. **Visual ⚠:** right-click an output port → consumers menu → pick → node appears wired
   downstream; right-click an input port → producers menu → pick → node appears wired upstream;
   search filters; outside-click/Escape closes. Screenshot.

## Out of scope

Coordinate-space filtering (dataType only for v1; space-mismatch still surfaces via validation);
choosing among multiple compatible ports (first compatible is enough); drag-from-port-to-empty
gesture (right-click only here); auto-layout beyond the placement offset.

## Handoff

→ Building graphs is port-driven: from any port, discover and add a type-compatible node
already connected. Complements the palette (add unconnected) and swap menu (replace in place).
