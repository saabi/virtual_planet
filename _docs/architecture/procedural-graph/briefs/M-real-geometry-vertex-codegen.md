# Brief — Real geometry + vertex-stage codegen (replace the pipeline stubs)

**Type:** core gap-fix (the pipeline nodes are stubs) · **Packages:**
`@virtual-planet/procedural-wgsl` (geometry/vertex WGSL), `@virtual-planet/runtime-webgpu`
(vertex-stage assembly + runner), `@virtual-planet/compiler` (stage.vertex entry) ·
**Depends on:** pipeline nodes ✅ (structural), assembleStageEntry ✅ · **Design authority:**
[pipeline-as-graph.md](../pipeline-as-graph.md),
[planet-pipeline-poc-feasibility.md](../planet-pipeline-poc-feasibility.md) (Mode-A) ·
**Contract author:** Opus · **Recommended executor:** browser-capable agent (⚠ visual).

## Problem

`packages/procedural-wgsl/src/modules/pipeline/stubs.ts` gives every pipeline node an
**empty WGSL body** (`fn planeGrid() {}`, `fn vertexStage() {}`, …), and the runner renders
via a **hardcoded fullscreen triangle** (`fullscreenFragment.ts` `FULLSCREEN_VERTEX_WGSL`)
— so the geometry/vertex/buffer/target nodes do **not** generate any real vertices. The
compiled-WGSL view shows empty stub functions and no tessellation/geometry-emission code.
The pipeline-as-graph is cosmetic at the geometry/vertex level. Make it real.

## Part 1 — `geometry.plane` emits real vertices (`procedural-wgsl`)

Replace the empty `planeGrid` stub with a real grid-position function:

```wgsl
// resU×resV grid of (resU)·(resV)·2 triangles, or an indexed grid. Position in the plane's
// local space; orientation/dimensions applied by transforms or the stage (see below).
fn plane_grid_position(vid: u32, resU: u32, resV: u32) -> vec3f { … } // returns the grid point
```

`geometry.fullscreenPlane` = this at `resU/resV = 2` (the 2-triangle quad). Emit real math
(map `vid` → cell → corner → `(u,v)` in `[-1,1]` or `[0,1]`, `z=0`). Provide `evalCPU` (CPU
parity, for headless tests + CPU preview). `buffer.persist`/`target.display` may stay
structural (no WGSL — mark them "structural node", not an empty stub).

## Part 2 — `stage.vertex` compiles to a real `@vertex` (`compiler`/`runtime-webgpu`)

`stage.vertex` assembles a real entry that calls the geometry function + its field subgraph:

```wgsl
@vertex fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  var out: VSOut;
  let p = plane_grid_position(vid, resU, resV);   // from the wired geometry node
  out.position = <field subgraph for clip position, identity for fullscreen>;
  // varyings (e.g. fragCoord/uv) for the fragment stage
  return out;
}
```

Generalize `assembleStageEntry`'s vertex template (it exists) to take the geometry call +
the field-subgraph expression from the wired nodes. For S0 the field is identity (pass the
plane position straight to clip space), proving the path; the planet PoC supplies a displace
field here later.

## Part 3 — Runner uses the generated vertex shader (`runtime-webgpu`)

The pipeline runner builds the vertex shader from `stage.vertex` + `geometry.plane` (draw
count = `resU·resV` verts × instances), **instead of** `FULLSCREEN_VERTEX_WGSL`. The
fullscreen ShaderToy case becomes `geometry.fullscreenPlane` → `stage.vertex (identity)` →
`stage.fragment` → `target.display`, all node-driven. Keep the existing fragment path.

## Gate

1. **Headless:** the compiled WGSL for the S0 pipeline contains the **real**
   `plane_grid_position` math (a grid computation, **not** an empty `fn planeGrid() {}`) and
   a `@vertex` entry that calls it; `evalCPU` of `geometry.plane` returns the expected grid
   corners for `resU/resV = 2`; no empty-stub function is emitted for a registered node
   (extend the no-stub guard).
2. **Visual ⚠:** the ShaderToy sample still renders (now via the node-driven plane), and the
   compiled-WGSL view shows real geometry + vertex code. Screenshot.
3. `check` **and** `test` green for every touched package; WGSL validity (device compile
   where available). 

## Out of scope

Cube-sphere / displaced planet vertex stages (planet PoC); LOD/instancing scheduler;
`transform.*` orientation/dimensions (separate, but this unblocks them). **No empty stubs
left for geometry/vertex/fragment nodes.**

## Handoff

→ The pipeline is genuinely node-driven (real geometry + vertex codegen), the compiled-WGSL
view shows real tessellation code, and the planet PoC's Mode-A vertex displacement plugs
into `stage.vertex`'s field slot.
