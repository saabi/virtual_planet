# Brief — Graph sample: animated Worley pipeline

**Type:** touch-up (editor samples) · **Package:** `@virtual-planet/graph-editor` ·
**Depends on:** pipeline consumer derivation ✅, port-direction fix ✅ ·
**Contract author:** Opus · **Recommended executor:** Cursor.

## Objective

Replace the obsolete **Noise field (scalar)** sample with a hard-coded **ShaderToy-style
pipeline graph** exported by the author:

`geometry.plane → buffer.persist → stage.vertex → stage.fragment → target.display`

Fragment field: `fragCoord × 0.01 + vec2(iTime)` → `noise.worley2d` → `vec4f` (α=1) →
fragment color.

## Files

- `packages/graph-editor/src/graphBuilders.ts` — `animatedWorleyPipelineGraph()`
- `packages/graph-editor/src/samples.ts` — swap sample registry entry
- `packages/graph-editor/src/GraphEditor.svelte` — default / New graph uses new sample
- `packages/graph-editor/src/samples.test.ts` — validate new sample; keep scalar builder tests
- `packages/graph-editor/src/effectGraph.test.ts` — pipeline wiring test *(new file or extend)*

## Cleanup vs raw export

The author export contained duplicate display targets, duplicate edge ids, dangling unused
nodes, and `noise.worley2d_4` wired as `noise.perlin2d`. The committed sample keeps one
display sink, connected nodes only, unique edge ids, and `noise.worley2d` on the worley node.

## Gate

1. `validateGraph` + `validateGraphFull` pass on `animatedWorleyPipelineGraph()`.
2. `effectiveGraphDocument` derives image consumer from `stage.fragment → target.display`.
3. Sample picker lists **ShaderToy — Animated Worley** (or similar); **Noise field (scalar)**
   removed from `GRAPH_SAMPLES`.
4. `npm run check -w @virtual-planet/graph-editor` **and** `npm test -w @virtual-planet/graph-editor` green.
5. `defaultPreviewGraph()` remains the simple scalar graph for unit tests that need CPU preview.

## Handoff

→ **Swap menu closes on click-outside** · Cursor · next ready task on board.
