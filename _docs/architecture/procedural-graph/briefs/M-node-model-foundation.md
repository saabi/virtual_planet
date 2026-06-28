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

## Slice 1 — Resource ports (graph) — ✅ DONE (`<this commit>`)

**Reality check (workflow caught the original over-design):** the IR **already** has
`DataType = ValueDataType | ResourceDataType` (M8 added `image`/`mesh`/`audio`), and
`compatibleDataTypes` already validates edges by equality (+ a `vec2f→vec3f` promotion). So
resource ports do **not** need a parallel `resource:` field or new validation — just
**extend the type union**. Done: added `PipelineResourceType`
(`geometry`/`vertexBuffer`/`indexBuffer`/`renderTarget`/`bindGroup`/`storageBuffer`), kept
`ResourceDataType` (external inputs) clean for `ResourceDependency`. The existing
equality-based validation already gives geometry↔geometry ✓ / geometry↔f32 ✗ / cross-kind ✗.
**Gate met:** graph 66/66; union extension broke no exhaustive switches across packages.

## Slice 2 — Role / contract metadata + swap families + help (graph)

- **Mechanical contract:** `contractOf(primitive): string` — a normalized hash of the port
  signature (e.g. `bin:f32,f32->f32`). Derived, not authored.
- **Role:** optional `role?: string` on primitive metadata (e.g. `'positionTransform'`,
  `'colorSpace'`). Authored where a *semantic* family matters.
- **Swap families:** `swapFamily(primitive)` = role if set, else contract. `listSwapFamily(id)`
  returns same-family primitives. **Gate:** `add`/`multiply`/`min`/`max` share a contract;
  `swapFamily` groups them; a `role`-tagged set groups across differing signatures.
- **Help/usage:** optional `help?` / `usage?` metadata (tooltips) — the **didactic** mechanism
  that **replaces aliases** (e.g. `math.min` help: "SDF union"). No alias nodes.

(Editor "Change operation ▸" + palette collapse + tooltips consume this —
node-model-design-notes §C. The editor wiring is a later graph-editor task.)

## Slice 3 — Node groups = self-describing **functions** (graph + compiler)

A **group is a primitive whose WGSL body calls other primitives** (node-model-design-notes
§E) — **not** an inlined subgraph. It unifies with M3 self-describing primitives.

- **Two forms, round-tripping:** JSON **subgraph** (canonical authoring; contract **inferred**
  from exposed ports — unconnected inner inputs → group inputs, designated outputs → group
  outputs) ↔ generated **WGSL function + frontmatter** (the compiled/portable form).
- **Codegen = code-generate a function**, *not* inline-expand: emit
  `fn group_x(…) -> … { … inner_fn(…) … }` whose deps are the inner primitives' modules. The
  **existing linker** resolves the function deps + tree-shakes — **no new inline pass**.
  Emitted once, called many times, deduped.
- IR: a `GroupDefinition { id, interface, subgraph, role?, help? }`; a node references a
  group id (built-in registry **or** a user-group store). `groupToFunction(def)` →
  `{ wgsl, frontmatter }` is the code-gen step (reuses the M3 loader for the resulting
  primitive).
- **Gate:** `g.normalDisplace` = `{multiply(normal,height) → add(position,…)}` →
  `groupToFunction` yields a `fn normalDisplace(...)` that calls `multiply`/`add`; the linker
  resolves their modules; compiling a graph using it produces valid WGSL equivalent to the
  hand-wired subgraph; contract inferred from the subgraph matches the function signature;
  round-trip serialize.

## Slice 4 — `list<T>` ports + lowering (graph + compiler)

A `list<T>` input accepts **multiple edges** of `T` (static) **or** a runtime
`storageBuffer<T>` (dynamic). Codegen lowers: **static → unroll** over the connected edges;
**runtime → loop** over the buffer + a count. **Gate:** a node with a `list<f32>` input fed
3 edges unrolls (3 inlined terms in WGSL); fed a `storageBuffer` emits a `for` loop.
(`forEach`/`reduce` container nodes are a later follow-on — node-model-design-notes §A.)

## Decomposition follow-on (after Slice 3)

With groups, refactor the audited decomposables (parity-preserving): `math.remap → group`,
`sdf.opSubtract → group(max + negate)`. **No aliases** — `sdf.opUnion`/`opIntersect` are
redundant with `math.min`/`max`; deprecate them in favour of `min`/`max` + **help tooltips**
("SDF union/intersection"). Keep `terrain.*` atomic (harvested at parity — do **not**
decompose). The elemental atoms (`add/subtract/multiply/divide/min/max`) are **already
added** ✅ as building blocks.

## Out of scope

The geometry/buffer/stage/target node *families* (consume this foundation — separate
briefs); the editor swap/group UI (graph-editor); the pass-graph executor; GPU runner.
**No AST.** Each slice ships independently.

## Handoff

→ With resource ports + role/contract + groups + list<T>, the pipeline node families
([M-pipeline-nodes-s0](./M-pipeline-nodes-s0.md)), the swap UX, the decomposition refactor,
and dynamic-light lighting all become "just nodes/metadata" over this foundation.
