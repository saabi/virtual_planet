# Brief — Final compiled-WGSL view

**Type:** editor (Tier 1, functional pipeline) · **Packages:** `@virtual-planet/graph-editor`
(panel), possibly a tiny helper in `runtime-webgpu`/`compiler` (assembly already exists) ·
**Depends on:** compileGraph ✅, assembleStageEntry ✅, pipelineGraph runner ✅, CodeMirror
✅ · **Design authority:** [pipeline-as-graph.md](../pipeline-as-graph.md),
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md) · **Contract author:** Opus ·
**Recommended executor:** Cursor (⚠ small visual gate).

## Objective

Add a **read-only "Compiled WGSL" panel** that shows the **full WGSL the current graph
compiles to** — the actual shader text, per consumer/output — so the author can *watch the
final compiled graph as a shader*. This closes the loop: per-node source (CodeView) →
**whole-graph compiled output** → preview. Updates on every graph edit.

## Headless core (the gate's anchor)

A pure helper that produces the final WGSL string(s) for the active graph, reusing the
existing assembly path (do **not** re-implement codegen):

```ts
// graph-editor/src/compiledWgsl.ts
import type { GraphDocument } from '@virtual-planet/graph';
import type { WgslModuleResolver } from '@virtual-planet/compiler';

export interface CompiledConsumerWgsl {
	consumerId: string;
	stage: string;
	outputs: string[];
	/** The final assembled, linked WGSL for this consumer (what a pipeline would use). */
	code: string;
}

/** Compile every consumer of `doc` to its final WGSL. For a pipeline graph (stage/target
 *  nodes) this is the pipeline runner's assembled module; for a field graph it is
 *  compileGraph → assembleStageEntry per consumer. Reuse the runtime's existing assembly. */
export function compiledGraphWgsl(doc: GraphDocument, resolver?: WgslModuleResolver): Promise<CompiledConsumerWgsl[]>;
```

Default `resolver = createStandardLibraryResolver()`. If the graph has a fragment/pipeline
consumer, prefer the runtime's `assembleFullscreenFragmentModuleAsync` / pipeline assembly
(the real shader). Surface compile **errors** as a returned diagnostic string, not a throw
(the panel must show "graph incomplete: …" rather than crash).

## Panel (`graph-editor`)

`CompiledWgslPanel.svelte` — a CodeMirror (WGSL, **read-only**) showing the selected
consumer's `code`; a small selector when there are multiple consumers/outputs; recompiles
on graph change (debounced); shows compile/validation errors inline (ties to
[M-graph-validation-flagging](./M-graph-validation-flagging.md)). Register it as an editor
zone (`compiled` / "Compiled WGSL") in the subdivide layout. Keep `graph-editor` scene-free.

## Gate

1. **Headless:** for the default ShaderToy/cosine sample, `compiledGraphWgsl(doc)` returns a
   consumer whose `code` contains the entry (`@fragment fn …`) and the node functions
   (`cosine_palette`); for the noise→remap field graph it contains `remap` + `perlin`. An
   incomplete graph returns a diagnostic string, not a throw.
2. **Visual ⚠:** the panel shows the full compiled WGSL for the loaded sample, updates when
   a node/param/wire changes, and is read-only. Screenshot.
3. `npm run check`/`test -w @virtual-planet/graph-editor` (sceneFree green); `apps/graph-editor` builds.

## Out of scope

Editing the compiled output (read-only); per-line source mapping back to nodes (future);
GPU disassembly. **No new compiler codegen — reuse the existing assembly.**

## Handoff

→ With per-node source (CodeView) + whole-graph compiled WGSL + validity flagging, the
editor is a trustworthy, complete authoring tool (Tier 1).
