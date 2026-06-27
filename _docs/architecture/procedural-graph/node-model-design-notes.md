# Node-model design notes — collections, transforms, node-swap

**Status:** design recommendations · **Date:** 2026-06-27 (Opus) · **Scope:** three
modeling questions raised during the primitive-library work — (A) lists/loops over a typed
collection, (B) elemental geometry + composable transforms, (C) the Blender-math-node UX vs
performance. Feeds [primitive-library.md](./primitive-library.md) and
[pipeline-as-graph.md](./pipeline-as-graph.md).

---

## A. Collections & looping (e.g. PBR over N lights)

**Problem:** a node input that is a *list* of `T` (N lights into `material.pbrLighting`),
in a graph compiled to WGSL — where dynamic op-branching costs performance, but
data-dependent loops over buffers do not.

### Approaches considered

1. **`list<T>` multi-input port + compile-time unroll.** A port accepts multiple edges of
   `T`; the graph is static so N is known → codegen **unrolls** (`acc += pbr(…,light0); acc
   += pbr(…,light1); …`). No loop, no branch, perf-optimal. Best for **small, statically
   wired** sets. Plumbing: IR allows many edges into one list-port; codegen iterates them.
2. **Runtime storage-buffer + real loop.** Lights are a `storageBuffer<Light>` resource +
   `lightCount` uniform; the node's WGSL does `for i in 0..lightCount { acc += pbr(…,
   lights[i]); }`. **Standard real-renderer pattern** — scales to N, no recompile when the
   count changes. The loop is over *data*, which is fine (not op-branching). Best for
   **dynamic / scene-driven** sets.
3. **Container / iteration node** (Grasshopper *ForEach*, Houdini *foreach*, Blender geo-
   nodes *Repeat Zone*). A node runs a **body subgraph** per element of a collection.
   Compiles to unroll (static) or loop (runtime). Most **general** (arbitrary per-element
   subgraph), most plumbing (a nested "loop scope" + the body is a subgraph).
4. **Map / Reduce nodes** (functional). `map(list, body) → list`, `reduce(list, binaryOp,
   init) → scalar`. Lighting = `reduce(map(lights, perLight), add, 0)`. Composable; the
   key insight is **lighting is a fold/reduce**. Same power as (3), split into two nodes
   that take a subgraph as a parameter (higher-order ports).
5. **Fixed-cap array** (`array<Light, MAX>` + count). Pragmatic, inflexible — what many
   shaders do (MAX_LIGHTS); a special case of (1) with a cap.

### Recommendation

- Add a **`list<T>` port kind**. The compiler picks the strategy from how it is fed:
  **statically wired edges → unroll**; **a runtime storage buffer → loop**. One port type,
  two lowerings — no perf penalty either way (unroll for static, data-loop for dynamic).
- **For lights specifically, default to the runtime storage-buffer + loop** (2) — scene
  lights are dynamic; this is the proven renderer pattern and matches the planet's lighting
  uniforms. Expose `lights` as `buffer.storage` + `lightCount`.
- Add a **`forEach` / `reduce` container node** (3/4) as the *general* mechanism, later —
  for arbitrary per-element subgraphs (scatter, accumulation). Lighting is the motivating
  reduce; vegetation candidate accumulation is another.
- **Avoid** dynamic *operation* selection inside a loop (that is the perf trap — see C);
  data loops are fine, op branches are not.

Permissive typing alone (just "accept any number of T") is approach (1) — fine for small
static sets, but pair it with the storage-buffer path for scale.

---

## B. Elemental geometry + composable transforms (decompose cube-sphere)

**Recommendation: yes — decompose.** `geometry.cubeSphere` becomes:

- **`geometry.cube`** — six cube faces (or `geometry.plane` instanced ×6) → a raw **vertex
  list** (resource).
- **`transform.spherify`** — normalize positions onto the unit sphere. Operates on **any
  vertex list** (plane, cube, grid, imported mesh) — not cube-specific.
- **`transform.displace`** — offset positions along the normal by a field (terrain height).

This yields **elemental sources + reusable transforms** (the pipeline-as-graph "tessellator
= composition" principle), and the same `spherify`/`displace` apply to planes or any
geometry.

**Where transforms run:** a position transform is a **per-vertex** operation → it lives in
the **vertex stage**, whose per-vertex invocation *is* the implicit loop over vertices (no
explicit loop node needed). So: `geometry.cube → stage.vertex[spherify → displace(field)] →
…`. The transforms compose inside the vertex stage's field subgraph.

**But most transforms are *compositions*, not new primitives** (see §E). At the math level:
`vector displace` = `add(position, vec)` — *literally* `math.add`; `normal displace` =
`multiply(normal, height)` → `add(position, …)`; `spherify` = `normalize(position)`. So they
are **node groups** over elemental ops (add/multiply/normalize), **not** hand-written WGSL —
a named transform buys *semantic clarity + fewer wires* at **zero runtime cost** (a group
compiles inline to the same WGSL). Keep `math.add/multiply/normalize` atomic; ship
`transform.normalDisplace`, `transform.twist`, etc. as **built-in groups**; `vector
displace` simply *is* `add` (no separate node).

---

## C. One mega-node vs per-op nodes — the node-swap UX

**The tradeoff (user is right):** Blender's single *Math* node with a runtime operation
dropdown would compile to a WGSL `switch(op)` — **branching + every op in the shader** =
performance and bloat cost in a *compiled* graph. Per-op nodes (`math.add`, `math.multiply`,
…) each compile to exactly their op, **zero overhead** — but the palette is cluttered and
changing an op means delete+rewire.

**Recommendation: keep per-op nodes; solve the UX with in-place node replacement among nodes
that share a *contract*.**

- Define a **node contract** = a port signature (e.g. *binary-f32*: `(a: f32, b: f32) →
  (out: f32)`). Nodes with the same contract form a **swap family**.
- Editor affordance: select a node → **"Change operation ▸"** lists same-contract nodes →
  swap **in place, preserving all edges** (the ports match by contract). One click to go
  `add → multiply`, Blender-style convenience, **no runtime branch** (each node is still its
  own op, compiled cleanly).
- **Palette compaction:** collapse a swap family into one expandable entry (*"Math op ▸"*)
  so the palette is as compact as Blender's, while distinct nodes live underneath.

This generalizes far beyond math:
- **Binary math** (`add/multiply/min/max/pow/…`) — one swap family.
- **Noise** (`perlin3d/simplex/worley`, all `(pos: vec3) → f32`) — swap family.
- **SDF shapes** (`circle/box/hexagon…`, `(p, …) → f32`) — swap family.
- **Blend modes, surface mappings, tonemap operators, colour spaces** — each a swap family.

### Two levels of contract (the vector-add ≡ vector-displace question)

`add(vec3,vec3)→vec3` and "vector displace" have the **same signature** — because they are
the **same operation** (displace *is* add). That exposes two distinct notions:

- **Mechanical contract** = exact signature → *codegen interchangeability* (add/multiply/min
  all share `(f32,f32)→f32`). Hashable from the ports.
- **Role contract** = the *semantic slot* a node fills → *meaningful* swap families. "Vertex
  position transform" (consumes `position` → produces `position`) is a role; `normalDisplace`,
  `spherify`, `twist` fill it even though their *secondary* inputs differ. The editor swaps
  the **primary** edge and leaves secondary inputs to rewire.

**Swap families are defined by role, not raw signature.** Consequence: `vector-displace`
does not need to exist (it's `add`); `normalDisplace`/`spherify`/`twist` are one role-family
(swappable), even when each is a **group** (§E).

**Implementation:** primitive metadata carries a mechanical `contract` (derivable signature
hash) **and** an optional `role` tag; the editor groups by `role` for swap + palette
collapse, falling back to `contract`. Schema-driven, zero perf cost — the right answer for a
*compiled* graph.

---

## E. Node groups (subgraphs) as first-class library entries

Your "displace = composition" + "group of nodes with the same contract" lead here:

- **Two groupings:** a **zone/frame** (visual comment box, no semantics — clears clutter)
  *and* **collapse-to-node** (a *functional* group with an interface). Like Blender node
  groups / Grasshopper clusters / Houdini subnets.
- **A group's interface IS its contract** (role + ports) → a group and an atomic node with
  the same role are **interchangeable** (swap families span both).
- **"Primitive" unifies to: atomic OR group.** An atomic primitive = WGSL + evalCPU
  (existing). A **group primitive** = a saved **subgraph** + interface. Both register the
  same way, both appear in the palette, both compile — a group **inlines** to its subgraph's
  WGSL (zero runtime cost; it is purely an authoring/view convenience).
- **Built-in + user groups.** Built-in (hardcoded standard-library subgraphs:
  `transform.normalDisplace` = multiply+add; `geometry.cubeSphere` = cube + normalize). User:
  select nodes → **"Save as group"** → a reusable palette entry (stored like a
  self-describing primitive — a subgraph document with declared in/out ports).
- **Generalizes `stage.*`** (pipeline-as-graph) — a stage node already "embeds a subgraph";
  a group is that pattern made general for any node.

**Effect on the library:** keep the **atomic** layer small (math/noise/sdf/normalize/the
WGSL intrinsics); express convenience nodes (`normalDisplace`, `cubeSphere`, recurring
effect chains) as **groups**. This realizes "elemental primitives + composition" — fewer
hand-written WGSL primitives, more composed, swappable, user-extensible groups. See
[primitive-library.md](./primitive-library.md) (transforms/cubeSphere reclassified as groups).

---

## D. Follow-on: harvest colour transforms from `colorlab`

`/home/ushif/repos/colorlab/fe/src/lib/color/` (the user's own repo — no external license)
has a deep colour-science library: XYZ ↔ Lab/Luv/OKLab/LMS, sRGB transfer, gamut mapping,
chromatic adaptation, CVD simulation. The **per-pixel** conversions are excellent `color.*`
primitives (the gamut-boundary / diagram generators are not per-pixel — skip). Pinned as
[briefs/M-colorlab-harvest.md](./briefs/M-colorlab-harvest.md).
