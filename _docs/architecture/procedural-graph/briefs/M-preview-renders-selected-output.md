# Brief — Effect preview renders the selected output (not the first target)

**Type:** 🔴 fix (per-pane selection has no visual effect) · **Packages:**
`@virtual-planet/runtime-webgpu` (`pipelineGraph.ts`), `@virtual-planet/graph-editor`
(`EffectPreviewPanel.svelte`) · **Depends on:** per-pane preview selection ✅ (`b73e6b3`),
multi-target derivation ✅ (`b49d897`) · **Design authority:** `pipeline-as-graph.md` ·
**Contract author:** Opus · **Recommended executor:** Cursor.

## Problem

Per-pane buffer **selection** works (each pane's tab is independent), but every pane renders
the **same primary target** — so selecting the second output shows the first target's image.

Root cause: `EffectPreviewPanel.svelte` (line ~85) renders via
`new PipelineGraphExecutor().execute({ device, graph, ... })` — it passes `graph` but **not**
`output`. The `output` prop is only a render guard (`if (!output) return`). And
`PipelineGraphExecutor` / `buildPipelinePlan` (`pipelineGraph.ts:113`) does
`findNode(doc, 'target.display')` → the **first** display, always rendering `plan.fieldOutput`
of the *primary* pipeline. So the per-pane `output` (correctly resolved by `PreviewZone` to
each sink's field) is discarded.

## Fix

Thread the selected output through to the executor so it renders **that** field:

1. **`pipelineGraph.ts`:** `execute` (and `buildPipelinePlan`) accept an **optional target
   selector** — the `output` `PortRef` (or the display sink node id). When provided, the plan's
   `fieldOutput` is that output and the display target is the sink that consumes it; when
   omitted, keep today's first-display behavior (back-compat). Don't hardcode the first
   `target.display` when a target is specified.
2. **`EffectPreviewPanel.svelte`:** pass the `output` prop into `executor.execute({ …, output })`
   so each pane renders its selected buffer's field. (Re-run the render effect on `output`
   change — it already guards on `output`; ensure the effect's dependency set includes it.)

Result: pane showing `pipeline_image_n_display` renders `n_vector_vec4f_2` (worley/perlin —
colourful); pane showing `pipeline_image_n_target_display_1` renders `n_vector_vec4f_3`
(x=y=0, z=perlin3d, w=1 — blue-dominant). Two panes, two different images.

## Gate

1. **runtime-webgpu:** `execute`/`buildPipelinePlan` with an explicit output/target renders
   **that** sink's field (assert the plan's `fieldOutput`/display resolves to the specified
   one, not the first); omitting it keeps the first-target default. Test (headless plan
   assertion; device-gated render where an adapter exists).
2. **graph-editor:** `EffectPreviewPanel` forwards `output` to the executor; two panels with
   different `output` props resolve different fields (testable at the plan level).
3. `check` **and** `test` green for both packages; keep prior tests green.
4. **Visual ⚠:** the two-target Worley graph in two panes shows the colourful target in one and
   the blue-dominant target in the other, simultaneously. Screenshot.

## Out of scope

Non-image preview families (Cpu/Gpu already thread `output`); multi-pass frame-graph ordering;
picking among multiple sinks that share a field (each buffer already maps to one field/sink).

## Handoff

→ The Effect preview renders the pane's selected output, completing per-pane multi-target
inspection — the executor is target-aware instead of always rendering the first display.
