# Brief — Stage entry points + bind-group layout

**Type:** core compiler (follow-on to multi-output) · **Package:**
`@virtual-planet/compiler` · **Depends on:** M-multi-output-compile ✅ (`compileGraph`) ·
**Design authority:** [graph-and-compiler.md](../graph-and-compiler.md),
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md) (text only, no AST) ·
**Contract author:** Opus · **Recommended executor:** Opus (core) or Cursor once pinned.

## Objective

`compileGraph` gives a per-consumer **function library** (`ConsumerShader.code`). To run on
WebGPU each shader needs a **stage entry point** (`@vertex` / `@fragment` / `@compute`) that
calls the consumer's output function(s), plus the **uniform/storage bind declarations** the
entry references. Wrap each `ConsumerShader` into a pipeline-ready WGSL module + a
bind-group layout description. Text assembly only — **no AST**.

## Public surface (`compiler/src/stageEntry.ts`, new)

```ts
import type { ConsumerShader } from './compileGraph.js';

export interface BindingDecl {
	group: number;
	binding: number;
	name: string;
	/** WGSL resource kind for layout creation. */
	kind: 'uniform' | 'storage-read' | 'texture' | 'sampler';
	wgslType: string;        // e.g. 'ViewUniforms', 'array<Patch>', 'texture_2d<f32>'
}

export interface StageEntryOptions {
	/** Bindings the entry exposes (host/runtime inputs, resources, instance buffers). */
	bindings?: BindingDecl[];
	/** Compute workgroup size (compute stage only). */
	workgroupSize?: [number, number, number];
	/** Map each graph output name → the generated fn to call for it (from the slice). */
	outputFns: Record<string, string>;
}

export interface StageModule {
	consumerId: string;
	stage: string;
	/** Full WGSL: binding decls + the consumer's function library + the entry fn. */
	code: string;
	bindings: BindingDecl[];
}

export function assembleStageEntry(shader: ConsumerShader, opts: StageEntryOptions): StageModule;
```

## Behavior (per stage)

Prepend the `bindings` as WGSL `@group(g) @binding(b) var<…> name: type;` declarations,
then `shader.code` (the function library), then an entry fn:

- **fragment:** `@fragment fn fs_main(in: VSOut) -> @location(0) vec4f { return <outputFn for the color output>(…); }`
- **vertex:** `@vertex fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut { … return … }` — calls the position/displacement output fn; the `VSOut` struct and how inputs map to fn args are driven by `opts` (keep minimal/configurable, not planet-specific).
- **compute:** `@compute @workgroupSize(x,y,z) fn cs_main(@builtin(global_invocation_id) gid: vec3u) { … }`.

Keep the entry templates **generic** (a fullscreen-fragment effect and a compute effect
must both assemble) — planet-specific `VSOut`/varyings are supplied via `opts`, not baked.
The fullscreen-fragment case (ShaderToy) is the simplest: no instance inputs, one color out.

## Gate (`stageEntry.test.ts`)

1. A fragment `ConsumerShader` (e.g. the cosine-palette function) → `assembleStageEntry`
   yields WGSL containing `@fragment fn fs_main`, the binding decls, and a call to the
   output fn; no AST/parse-tree types exported.
2. A compute consumer → `@compute @workgroupSize(...)` entry present.
3. Bindings render as `@group(N) @binding(M) var<...>` in the right order.
4. Optional: assembled fragment WGSL compiles under `wgslCompile.test.ts` when a device
   exists (skips headless).
5. `npm run check`/`test -w @virtual-planet/compiler` green (compileGraph tests stay green).

## Out of scope

Render-target binding / pass scheduling (the pass-graph executor owns that); GPU pipeline
creation (runtime-webgpu); reflection of bind groups from WGSL (caller supplies
`bindings`). **No AST; no new exports beyond the above.**

## Handoff

→ With per-stage pipeline-ready modules + bind layouts, the runtime can create pipelines
directly. **ShaderToy S0** (fullscreen fragment) and the pass-graph **GPU executor** are
unblocked; the planet PoC's vertex+fragment stages assemble from the shared shaping library.
