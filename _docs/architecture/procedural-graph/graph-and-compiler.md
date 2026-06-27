# Typed graph & compiler

**Status:** architecture · **Scope:** `packages/graph` (Typed Graph IR),
`packages/compiler` (slicing, codegen, module resolution, linking),
`packages/procedural-wgsl`. Part of the
[Procedural Graph System](./README.md).

## Typed graph system

Every node produces a **typed field**: `Field<float|vec2|vec3|vec4|bool>` plus
semantic port types (`surfacePosition`, `normal`, `material`, `mask`,
`densityField`, …). Invalid connections are impossible — port compatibility is
schema-driven (see [schema-and-primitives.md](./schema-and-primitives.md)) and
validated *while editing*, before compilation.

**Coordinate-space port types.** Beyond data type, ports also carry a *coordinate
space* — `world_dir`, `body_dir`, `world_pos`, `body_pos`,
`ideal_fragment_body_dir`, `height_meters`, `world_radius_meters`, `scale_ctx`, …
(the space table in
[planet-shaping-pipeline-graph.md](../../planet-shaping-pipeline-graph.md)). The
compiler **rejects an edge whose producer and consumer spaces disagree unless an
explicit transform node sits between them.** This is what makes the whole class of
"missing inverse `planetRotation`" / "terrain stuck in viewport space" bugs
*unrepresentable* rather than merely patched one symptom at a time.

Standard graph inputs (procedural):

```
positionSphere · positionMeters · surfaceNormal · planetRadius
altitude · slope · curvature · uv · faceId · seed · time
```

Beyond these, the host runtime supplies **runtime inputs** (camera, derived
frustum, pointer/world ray, viewport) and **resource inputs** (image/mesh/audio),
several of which are CPU-computed — see
[inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md).

A single graph exposes **many named outputs** simultaneously, e.g.:

```
terrainHeight · terrainNormal · terrainAlbedo · terrainMaterial
beachMask · snowMask · erosionMask · waterMask
treeDensity · treePeakField · grassCoverage · rockDistribution
windField · moisture · temperature · lodDensity
```

One field may feed several outputs with no duplicated logic — e.g. *Mountain
Noise* → terrain height, rock distribution, snow accumulation, and vegetation
suppression. Outputs are consumed independently
(see [runtime-and-tessellation.md](./runtime-and-tessellation.md)).

## Compiler

The compiler turns the graph into minimal, pipeline-specific WGSL.

**Dependency slicing.** Each consumer requests only the outputs it needs; the
compiler walks the graph backward from those outputs and extracts the minimal
sub-graph. Unrelated branches (beaches, erosion, albedo…) are never compiled into
a vegetation shader, and terrain shaders never evaluate tree placement unless
asked.

**Multi-output compilation.** Different consumers get different slices of the
same graph:

```
terrainHeight  → tessellator / mesh-gen shader
terrainAlbedo  → fragment shader
treePeakField  → vegetation compute shader
grassCoverage  → fragment shader + grass pass
```

**WGSL function generation.** Nodes emit *reusable functions*, never complete
shaders: `fn terrain_height(...)`, `fn tree_density(...)`, `fn grass_coverage(...)`,
etc. Pipeline shaders are assembled by importing only the functions a slice needs.

**WGSL module resolution.** Primitive schemas reference WGSL by **stable module
IDs**, not file paths — `noise.perlin3d`, `terrain.erosion`,
`vegetation.treePeak`. A `WgslModuleResolver` maps IDs → sources, so project
layout can change without breaking saved graphs:

```ts
type WgslSourceRef    = { moduleId: string; entry: string; exports?: string[]; dependencies?: string[] };
type WgslModuleResolver = { resolve(moduleId: string): Promise<string> };
// resolver.resolve('noise.perlin3d') → packages/procedural-wgsl/src/noise/perlin3d.wgsl
```

Reusable modules live in `packages/procedural-wgsl/` (`noise/`, `terrain/`,
`vegetation/`, `atmosphere/`, `math/`, `utilities/`) and export functions, not
shaders. This is the procedural standard library.

**Primitive loader (signature inference + YAML merge).** A WGSL module can also
*carry its own primitive schema* (see
[schema-and-primitives.md → Self-describing WGSL primitives](./schema-and-primitives.md#self-describing-wgsl-primitives)).
When loading such a module the compiler:

1. reads function **signatures** from the WGSL source — name, params, WGSL types,
   return type, `use` dependencies (not a full semantic AST; see
   [wgsl-parsing-and-codegen.md](./wgsl-parsing-and-codegen.md));
2. extracts the YAML frontmatter block comment — category, units, widgets, ranges,
   docs, defaults;
3. merges them into a complete primitive schema (signatures ⇒ mechanical types/ports,
   YAML ⇒ editor/domain semantics) and registers it.

So module resolution by stable ID and self-describing WGSL primitives are two
sides of the same loader: the resolver locates the source, the loader derives the
schema. No handwritten WGSL dependency lists are maintained — discovery is graph-
and source-driven.

**Shader linker.** A dedicated `ShaderLinker` abstraction assembles stage-
specific shaders from generated/resolved functions: dependency ordering, dup
elimination, module composition, stage assembly, and WGSL-level dead-code
elimination. The first implementation stays intentionally minimal (graph-level
slicing already did the heavy lifting). The repo's current `fe/vite-wgsl.ts`
`#include` expansion is the **textual precursor** this generalizes into typed,
dependency-ordered module composition — the shaping pipeline already calls for
emitting an ordered WGSL include list plus `sampleShape()` / `sampleMaterial()` /
`sampleNormal()` wrappers. Use.GPU's `@use-gpu/shader` (`linkBundle`, WGSL
loaders/imports) is a strong reference and *may* be reused behind the internal
interface to accelerate development — but the compiler must never depend on a
specific linker. Parse trees from such adapters stay internal; see
[wgsl-parsing-and-codegen.md](./wgsl-parsing-and-codegen.md).

```ts
interface ShaderLinker { link(entry: WGSLFunction, deps: WGSLModule[]): string }
```

**Two levels of tree shaking.** Graph-level (compiler removes unused fields /
branches → minimal procedural graph) and WGSL-level (linker removes unused helper
functions/imports → minimal shader per pipeline). The Use.GPU-style linker gives
the second level but does **not** replace graph dependency slicing; multi-output
support lives in the IR/compiler, not the linker.

## First consumer: the planet shaping graph

The existing terrain pipeline
([planet-shaping-pipeline-graph.md](../../planet-shaping-pipeline-graph.md)) is
the first graph to compile through this path — generating the cube-sphere and
surface-patch shaders from **one** shaping graph so their analytic terrain meaning
cannot drift by hand. Its first compiler can start as a declarative module registry
that emits an ordered include list, port struct/constant names, and the
`sampleShape/Material/Normal` wrappers, with parity tests asserting both terrain
variants call the same shaping wrappers; it grows into the full linker later.

Per [renderer-unification-plan.md](../../renderer-unification-plan.md) this
compiler is **deferred** behind that plan's contract work (explicit param/scale and
coordinate-space types, route-parity tests, debug material views) — those
byproducts are the near-term enabling steps, and the shaping graph is the gate
before generalizing to new consumers (vegetation, water, atmosphere).
