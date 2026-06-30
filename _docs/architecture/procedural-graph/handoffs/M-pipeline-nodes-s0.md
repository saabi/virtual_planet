# Handoff — M-pipeline-nodes-s0

**Brief:** [`../briefs/M-pipeline-nodes-s0.md`](../briefs/M-pipeline-nodes-s0.md)
**Assigned executor:** Codex
**State:** accepted; commit pending

## Result

Implemented the first S0 pipeline-as-graph slice:

- Added pipeline resource data types for `texture` and `varyings`.
- Registered S0 pipeline primitives:
  - `geometry.fullscreenPlane`
  - `geometry.plane` (`resU` / `resV` parametric grid; S0 uses `{ resU: 2, resV: 2 }`)
  - `buffer.persist`
  - `stage.vertex`
  - `stage.fragment`
  - `target.display`
- Added resolver-only WGSL modules for the pipeline primitive IDs, preserving the standard-library resolver contract.
- Rebuilt the graph-editor ShaderToy cosine sample as an explicit pipeline:
  `geometry.plane -> buffer.persist -> stage.vertex -> stage.fragment -> target.display`,
  with `effect.cosinePalette` feeding the fragment stage color field.
- Added a minimal `PipelineGraphExecutor` in `@virtual-planet/runtime-webgpu` that:
  - validates/plans the explicit S0 resource chain via the `pipelineGeometrySource` role,
  - finds the fragment field output,
  - fingerprints persistent geometry by persist node + source primitive + params,
  - delegates the current draw path to `executeFullscreenFragment`.
- Switched the graph-editor effect preview to use a persistent `PipelineGraphExecutor` per preview session.

## Files changed

- `packages/graph/src/types.ts`
- `packages/graph/src/primitives/pipeline/index.ts`
- `packages/graph/src/primitives/pipeline/fullscreenPlane.ts`
- `packages/graph/src/primitives/pipeline/plane.ts`
- `packages/graph/src/primitives/pipeline/pipeline.test.ts`
- `packages/graph/src/primitives/index.ts`
- `packages/graph/src/graph.test.ts`
- `packages/procedural-wgsl/src/modules/pipeline/stubs.ts`
- `packages/procedural-wgsl/src/modules/index.ts`
- `packages/runtime-webgpu/src/pipelineGraph.ts`
- `packages/runtime-webgpu/src/pipelineGraph.test.ts`
- `packages/runtime-webgpu/src/index.ts`
- `packages/graph-editor/src/graphBuilders.ts`
- `packages/graph-editor/src/EffectPreviewPanel.svelte`
- `packages/graph-editor/src/previewBackend.ts`
- `packages/graph-editor/src/effectGraph.test.ts`
- `packages/graph-editor/src/samples.test.ts`

## Gates run

```sh
npm run check -w @virtual-planet/graph
npm test -w @virtual-planet/graph
npm run check -w @virtual-planet/procedural-wgsl
npm test -w @virtual-planet/procedural-wgsl
npm run check -w @virtual-planet/runtime-webgpu
npm test -w @virtual-planet/runtime-webgpu
npm run check -w @virtual-planet/graph-editor
npm test -w @virtual-planet/graph-editor
npm run check -w @virtual-planet/graph-editor-app
npm run build -w @virtual-planet/graph-editor-app
```

All passed after the A/B/C integration. Latest observed counts: graph 92/92,
procedural-WGSL 91/91, runtime-webgpu 44/44 with 10 skipped headless WebGPU tests,
graph-editor 57/57. The app build emitted pre-existing Svelte unused-CSS warnings in
`CodeView.svelte` and `MarkupView.svelte`, plus a chunk-size warning.

`git diff --check` is blocked by a pre-existing CRLF-only diff in
`fe/src/lib/planet/gpu/wgsl/debug/materialDebug.wgsl`. A scoped diff-check for the files
changed by this task passed.

## Unresolved issues

- The executor is intentionally S0-minimal. It plans the explicit pipeline and preserves
  `buffer.persist` cache identity, but it still delegates the actual fullscreen draw to the
  existing fragment path rather than allocating vertex buffers from the graph.

## Visual gate

Passed. The graph-editor ShaderToy cosine sample shows the explicit
`geometry.plane -> buffer.persist -> stage.vertex -> stage.fragment -> target.display`
pipeline and renders the preview. Screenshot:
[`_docs/screenshots/cosine-palette.png`](../../../screenshots/cosine-palette.png).

## Working-tree notes

Pre-existing unrelated dirty/untracked files remain untouched:

- `fe/src/lib/planet/gpu/wgsl/debug/materialDebug.wgsl`
- `_docs/camera-near-far-geometry.html`
- `_docs/pending_issues.md`
- `packages/graph/tsconfig.tsbuildinfo`
- `packages/runtime-webgpu/tsconfig.tsbuildinfo`

## Reviewer decision

Accepted.

## Commit record

Pending.
