# Brief — Node-model foundation (resource ports · list<T> · groups · role/contract)

**Type:** foundational IR/compiler (the R1 keystone, folded) · **Packages:**
`@virtual-planet/graph` (IR), `@virtual-planet/compiler` (group inline-expansion) ·
**Depends on:** the current IR/compiler ✅ · **Design authority:**
[pipeline-as-graph.md](../pipeline-as-graph.md),
[node-model-design-notes.md](../node-model-design-notes.md),
[pipeline-realignment-report.md](../pipeline-realignment-report.md) · **Contract author:**
Opus · **Recommended executor:** Opus (foundational, headless), built in the slices below.

## Objective

Extend the node model with the four foundations everything else (geometry/buffer/stage/
target nodes, swap UX, decomposition into groups, dynamic lights) needs. **Additive** —
the existing value-port field graph + ~45 primitives + compiler are unchanged underneath.
Build in **independent, separately-gated slices** (each green on its own).

## Slice 1 — Resource ports (graph)

`Port` carries a value `dataType` **or** a `resource: ResourcePortKind`
(`vertexBuffer`/`indexBuffer`/`geometry`/`texture`/`renderTarget`/`bindGroup`/
`storageBuffer`). `validateGraph` gains: resource↔resource edges match by kind; value and
resource ports never cross-connect. **Gate:** accept a `geometry→geometry` edge, reject a
`geometry→f32` edge; serialize round-trips a resource port.

## Slice 2 — Role / contract metadata + swap families (graph)

- **Mechanical contract:** `contractOf(primitive): string` — a normalized hash of the port
  signature (e.g. `bin:f32,f32->f32`). Derived, not authored.
- **Role:** optional `role?: string` on primitive metadata (e.g. `'positionTransform'`,
  `'sdfOp'`, `'colorSpace'`). Authored where a *semantic* family matters.
- **Swap families:** `swapFamily(primitive)` = role if set, else contract. `listSwapFamily(id)`
  returns same-family primitives. **Gate:** `add`/`multiply`/`min`/`max` share a contract;
  `swapFamily` groups them; a `role`-tagged set groups across differing signatures.

(This is what the editor's "Change operation ▸" + palette collapse consume —
node-model-design-notes §C. The editor wiring is a later graph-editor task.)

## Slice 3 — Node groups (graph IR + compiler)

A **group** is a node whose "primitive" is a **subgraph** with a declared interface
(in/out ports = its contract). Serializable like any node.

- IR: a `GroupDefinition { id, interface: {inputs, outputs}, subgraph: GraphDocument,
  role? }`; a node may reference a group id (built-in registry **or** a user-group store).
- **Compiler inline-expansion:** before slicing/codegen, expand group nodes by inlining
  their subgraph (rename inner node ids, wire interface ports to the call site). A group
  compiles to **exactly** the WGSL of its inlined subgraph — **zero runtime cost**.
- Built-in groups register like primitives; user groups are saved subgraphs (a "Save as
  group" document, later in graph-editor).
- **Gate:** a group `g.normalDisplace` = `{multiply(normal,height) → add(position,…)}`
  expands + compiles to the same WGSL as the hand-wired subgraph; round-trip serialize; a
  group is a valid swap-family member by its interface.

## Slice 4 — `list<T>` ports + lowering (graph + compiler)

A `list<T>` input accepts **multiple edges** of `T` (static) **or** a runtime
`storageBuffer<T>` (dynamic). Codegen lowers: **static → unroll** over the connected edges;
**runtime → loop** over the buffer + a count. **Gate:** a node with a `list<f32>` input fed
3 edges unrolls (3 inlined terms in WGSL); fed a `storageBuffer` emits a `for` loop.
(`forEach`/`reduce` container nodes are a later follow-on — node-model-design-notes §A.)

## Decomposition follow-on (after Slice 3)

With groups, refactor the audited decomposables to groups/aliases (parity-preserving):
`math.remap → group`, `sdf.opUnion → alias(math.min)`, `sdf.opIntersect → alias(math.max)`,
`sdf.opSubtract → group(max+negate)`. Keep `terrain.*` atomic (harvested at parity — do
**not** decompose). The elemental atoms (`add/subtract/multiply/divide/min/max`) are
**already added** ✅ as building blocks.

## Out of scope

The geometry/buffer/stage/target node *families* (consume this foundation — separate
briefs); the editor swap/group UI (graph-editor); the pass-graph executor; GPU runner.
**No AST.** Each slice ships independently.

## Handoff

→ With resource ports + role/contract + groups + list<T>, the pipeline node families
([M-pipeline-nodes-s0](./M-pipeline-nodes-s0.md)), the swap UX, the decomposition refactor,
and dynamic-light lighting all become "just nodes/metadata" over this foundation.
