# Brief — ShaderToy S0: fullscreen-fragment runtime + first effect

**Type:** PoC vertical slice (first visible graph→pixels) · **Packages:**
`@virtual-planet/runtime-webgpu` (fullscreen-fragment consumer),
`@virtual-planet/procedural-wgsl` + `@virtual-planet/graph` (the effect primitive),
`@virtual-planet/graph-editor` (preview wiring) · **Depends on:** `compileGraph` ✅,
`assembleStageEntry` ✅, procedural-wgsl ✅ · **Design authority:**
[planet-pipeline-poc-feasibility.md](../planet-pipeline-poc-feasibility.md) §5b,
[inputs-cpu-and-resources.md](../inputs-cpu-and-resources.md),
[briefs/M-shadertoy-poc.md](./M-shadertoy-poc.md) (Effect 1) · **Contract author:** Opus ·
**Recommended executor:** **browser-capable agent** (Gemini Antigravity / Cursor) — ⚠ the
real gate is visual; the headless parts (WGSL assembly + uniform packing) Opus reviews.

## Objective

Render the **single-pass ShaderToy default** (animated cosine palette) from a *graph*, on
GPU, in the editor preview — the first end-to-end `graph → compileGraph → assembleStageEntry
→ pipeline → pixels`. **No pass graph / multibuffer** (that is S0.5). One fragment consumer,
output to a screen-sized target. Proves the fullscreen-fragment consumer + ShaderToy host
inputs (`iResolution` from the target, `iTime`, `iMouse`).

## Part 1 — The effect primitive (`procedural-wgsl` + `graph`)

Add `effect.cosinePalette` (WGSL in [M-shadertoy-poc.md](./M-shadertoy-poc.md) Effect 1):
`cosine_palette(fragCoord: vec2f, iResolution: vec2f, iTime: f32) -> vec4f`, registered with
`category: ShaderToy, group: Effects`. Author fresh (license note in that brief).

## Part 2 — Fullscreen-fragment consumer (`runtime-webgpu`)

```ts
// runtime-webgpu/src/consumers/fullscreenFragment.ts
import type { GraphDocument, PortRef } from '@virtual-planet/graph';
import type { WgslModuleResolver } from '@virtual-planet/compiler';

export interface ShaderToyHostInputs {
	iTime: number;
	iFrame?: number;
	/** Normalized pointer (xy in [0,1], zw click) — from the preview surface, not a buffer. */
	iMouse?: [number, number, number, number];
}

export interface FullscreenFragmentInput {
	device: GPUDevice;
	graph: GraphDocument;
	output: PortRef;            // the fragment vec4f color output
	resolver: WgslModuleResolver;
	width: number;             // the write target's size → iResolution
	height: number;
	host: ShaderToyHostInputs;
}

export interface FullscreenFragmentResult { width: number; height: number; pixels: Uint8Array; }

export function executeFullscreenFragment(input: FullscreenFragmentInput): Promise<FullscreenFragmentResult>;
```

Pipeline:
1. `compileGraph(graph, resolver, { consumers: [{ id:'image', stage:'fragment', outputs:[outputName] }] })`
   → the fragment consumer's function library.
2. `assembleStageEntry(shader, { bindings: [the ShaderToy uniform block], outputFns: { [outputName]: <entry fn> }, callArgs: ['in_frag_coord', 'u.iResolution', 'u.iTime'] })`.
   Add a generated **fullscreen-triangle vertex** entry (3 verts, no buffers) in the same module.
3. Pack a uniform block `{ iResolution: vec2f, iTime: f32, iMouse: vec4f, iFrame: u32 }` —
   **`iResolution` = (width,height)** (per-target, not a global), `iMouse` the normalized
   pointer × resolution if the effect wants pixels (document the convention).
4. Render to an offscreen `rgba8unorm` target sized width×height; read back to `pixels`.

`iResolution` binding from the target size is the load-bearing design point
([inputs-cpu-and-resources.md → binding contexts](../inputs-cpu-and-resources.md#host-input-binding-contexts-the-shadertoy-uniform-set-generalized)).

## Part 3 — Editor preview wiring (`graph-editor`)

Add an "effect" path to the GPU preview: build a graph from `effect.cosinePalette`, run
`executeFullscreenFragment` each animation frame with `iTime` from a clock and `iMouse` from
the **normalized preview-panel pointer**, blit `pixels` to the preview canvas. Keep
graph-editor scene-free (guard stays green). A tunable param via the existing inspector is a
bonus (full schema-form generality is later).

## Gate

1. **Headless (Opus-reviewable):** the assembled module string contains the fullscreen
   vertex entry, `@fragment fs_main`, the uniform-block binding decl, and the
   `cosine_palette(...)` call; uniform packing lays out `iResolution`/`iTime` at the right
   offsets (unit test on the packer).
2. **GPU (skips without device):** `executeFullscreenFragment` returns a width×height RGBA8
   buffer; at `fragCoord=(0,0), iTime=0` a sampled pixel matches `0.5+0.5*cos(uv.xyx+...)`
   within tolerance (real parity).
3. **Visual ⚠:** `/graph-editor` shows the **animated** cosine-palette gradient; moving the
   pointer is reflected if the effect uses `iMouse`. Paste a screenshot.
4. `npm run check`/`test -w @virtual-planet/{runtime-webgpu,graph,procedural-wgsl,graph-editor}`
   green; `fe` check green.

## Out of scope

Multibuffer / pass graph / feedback (S0.5 — `M-shadertoy-poc` + pass-graph executor);
resource `iChannel` textures (S1); the full schema-driven uniform form (params-as-inputs).
**No AST.**

## Handoff

→ First graph-driven pixels on screen. Next: **pass-graph GPU executor** + **S0.5** (Game of
Life multibuffer), then the planet PoC. The fullscreen-fragment consumer + host-input packing
are reused there.
