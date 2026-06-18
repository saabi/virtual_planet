# GPU patch scheduling — migrating the quadtree off the CPU

**Status:** proposal · **Scope:** `render/passes/` (terrain + cull), `gpu/wgsl/terrain/`,
`patches/`, with a WebGL fallback kept on CPU · **Driver:** spaceflight is pinned at
the 60 Hz floor because one full adaptive quadtree walk runs on the CPU every
frame.

## Current state

CPU does **scheduling + culling + LOD**; the GPU only draws what it's told.

- `scheduleAdaptiveOrbitPatches` walks a per-face quadtree, calling
  `patchScreenBounds` (mat4×vec3 per corner) per node — the flame-graph "forest".
- A compute **cull** pass exists and is **fully built but unwired**:
  `patchCullCompute.wgsl` + `PatchCullPass.encodeCullBucket` (uploads candidates →
  frustum/backface/horizon cull → atomic-compact to a visible buffer → writes an
  indirect-draw record). `terrainPass.prepareCubeBuckets` skips it and uploads the
  CPU-scheduled patches straight to the visible buffer.
- Arch-doc target (`virtual_planet_architecture_plan.md`): *compute pass generates
  visible patch descriptors + indirect draw records; render pass draws via
  indirect draw.*

## What fixes what (be honest about this)

| Change | Fixes the 16.7 ms CPU wall? | What it buys |
|--------|------------------------------|--------------|
| **Wire the existing cull** | **No** — CPU still walks the tree | Trims the *draw* list; re-culls with the live camera so a stale CPU schedule (the position-only cache) is harmless; cuts GPU draw/instancing |
| **GPU LOD compute** (replace the quadtree) | **Yes** | Removes the per-frame CPU tree walk + projection forest — the actual bottleneck |

The frame-coherent cache and these are complementary: cache reduces *how often* we
schedule; GPU compute reduces *the cost of* a schedule. The cull pass makes cache
staleness safe (live re-cull), which lets the cache be looser.

## Phased plan

### Phase 1 — wire the existing cull (toggle-gated, reversible)
- `terrainPass`: per bucket, `encodeCullBucket(encoder, candidates, resolution,
  cameraPos, radius, viewProj)` (a compute pass *before* the render pass), then
  `drawIndirect(bucket.indirectBuffer, 0)` instead of `draw(verts, instanceCount)`.
  The vertex shader already binds the bucket's `visibleBuffer`.
- Gate behind `USE_GPU_CULL` so it can be toggled off if anything regresses, and
  compared A/B.
- **Stats:** the CPU no longer knows the visible count → report the *candidate*
  count on the HUD (approximate) for now; exact count needs async readback.
- **Payoff:** GPU draw + cache-staleness safety; **not** the CPU walk. Smallest,
  lowest-risk real GPU step; de-risks the indirect-draw plumbing for Phase 2.

### Phase 2 — GPU breadth-first LOD compute (the real fix)
Replace `scheduleAdaptiveOrbitPatches` with a compute pipeline:
- CPU uploads a fixed coarse seed (per-face level-0 roots, or one subdivide level)
  and a camera uniform — that's its entire per-frame cost.
- Compute refines **level-synchronously** (one dispatch per depth `d`): each thread
  handles one node at depth `d`, projects its corners (the `patchScreenBounds`
  math, in WGSL), decides subdivide vs emit, and either appends children for depth
  `d+1` or atomic-appends a visible descriptor into the right resolution bucket.
  (Depth-first recursion maps poorly to GPU warps; BFS-per-level is the standard
  fit.) Near-plane straddle detection is the same corner projection.
- Vertex budget / priority: GPU top-K is hard — use a fixed per-bucket cap with
  atomic append (drop on overflow), matching today's `MAX_CUBE_PATCHES` cap. Exact
  priority drop can come later.
- Feeds Phase 1's indirect draw directly.

### Phase 3 — full indirect + async stats
- All buckets drawn via `drawIndirect`; no CPU patch list at all.
- HUD stats (`candidatePatches`, `budgetDropped`, `patchCount`) via **async**
  `mapAsync` readback (1-frame latency) or an approximate display — never a
  synchronous readback (it stalls the pipeline).

### WebGL fallback
GPU scheduling is WebGPU-only. WebGL keeps the CPU path with a lower patch budget.
Two code paths, selected by backend — already how cube/surface split works.

## Tradeoffs / risks

- **GPU may already be near budget.** The "partially-presented frame" in the trace
  can mean the GPU is also close to the 16.7 ms present deadline. Moving work CPU→GPU
  is a **net win only if the CPU is the bottleneck** (the profiles say yes) and the
  GPU has headroom; verify per phase.
- **Readback is a trap** — synchronous stats readback stalls; design async.
- **No headless verification.** All of this is GPU-only; correctness must be
  eyeballed in the app. Hence the toggle gates and A/B comparison per phase, and
  why each phase is independently shippable/reversible.
- **Coordination:** Phases 1/3 touch how the render loop / HUD consume the schedule
  (the spaceflight agent's `PlanetViewport`); coordinate on the stats handoff.

## Recommendation

Phase 1 first — it's small, reversible, grounded in a ready-built pass, and pairs
with the position-only cache. But it **won't move the CPU wall** on its own; set
that expectation. Phase 2 is the real fix and the larger investment. Drive both
with in-app GPU verification (toggle A/B), since none of it can be checked headless.
