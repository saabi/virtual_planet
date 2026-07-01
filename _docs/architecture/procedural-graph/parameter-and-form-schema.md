# Parameter & form schema — design record

**Status:** architecture decision · **Authority:** canonical for how editable
parameters are defined, validated, rendered in UI, serialized, and packed for
CPU/GPU consumers. Part of the [Procedural Graph System](./README.md).

> **For agents:** When a milestone brief, editor work, or renderer migration
> touches **parameter schemas**, **inspectors**, **uniform blocks**, or
> **host/runtime inputs**, **read this document first**. Propose changes here
> before adding a second slider list, a parallel param type, or a bespoke uniform
> editor. Touches M3 (YAML widgets on primitives), M9 (graph inspector), M9b,
> scene/planet forms, and planet-shaping migration.
>
> **Resource / asset / pointer inputs:** also read
> [parameter-and-form-schema-addendum.md](./parameter-and-form-schema-addendum.md)
> before M9, M10, or M14 — those are **not** param-form concerns.

---

## Decision (summary)

**One schema layer for parameter metadata; one shared form generator; separate
packing for GPU/uniform layouts.**

| Concern | Single SSOT? | UI | Packing |
|---------|--------------|-----|---------|
| Graph **node params** (per-instance) | Primitive param schema | Shared form generator | Compiler / `evalCPU` |
| Scene **node fields** (body, orbit, light, …) | `@virtual-planet/schema` TypeBox | Shared form generator | Scene document JSON |
| **Host / runtime inputs** (`time`, camera, …) | Port + input schema on graph | Read-only or host panels | Runtime bind per frame |
| **GPU uniform structs** (consumer blocks) | Derived from param schema + layout map | **Not** hand-edited WGSL layouts | `toGpu*` / `uniformLayouts` |
| Legacy **`PlanetParameters`** sliders | **Migrate away** | Replace `paramEditorSchema` | Keep until M13 parity |

**Do not** build a second parameter-description system (no duplicate slider tables
like `paramEditorSchema.ts` for new work). **Do not** expose raw WGSL `uniform`
struct editing in the graph editor.

---

## Context

Three surfaces already exist in the repo:

1. **`@virtual-planet/schema`** — TypeBox + `x-*` annotations (`quantity`, `ref`,
   `fields()`, `annotationsOf()`). Drives **`SchemaForm.svelte`** in `apps/scene-editor/` for
   `/scene` node kinds (`nodeSchemas.ts` → `editorForKind()`).
2. **`@virtual-planet/graph` `ParamSpec`** (M2) — minimal `{ name, type, default,
   min?, max? }` on `NodePrimitive`; **no UI yet**.
3. **`apps/scene-editor/params/paramEditorSchema.ts`** — hand-written slider sections keyed to
   `PlanetParameters`; **duplicate metadata** the procedural-graph architecture
   intends to retire.

The graph editor (`packages/graph-editor`) is still M0 scaffold. M9 will need an
**inspector**; M3 will add YAML frontmatter widgets on self-describing WGSL
primitives. Without a pinned policy, M9/M3 risk forking a third param model.

Shaders remain configurable from outside via **values bound at runtime** — but
authors edit **schemas**, not GPU struct layouts.

---

## Three parameter classes

Distinguish these in design, APIs, and docs. Do not merge into one bag.

### 1. Graph node parameters (authored)

- **What:** Per-node instance values for a primitive (`octaves`, `scale`, …).
- **Schema source:** `NodePrimitive.params` (converged on TypeBox; see below).
- **Storage:** On each graph node in `GraphDocument` (param snapshot or ref —
  exact shape is brief-owned; values are serializable JSON).
- **UI:** Graph editor `InspectorPanel` when a node is selected.
- **Runtime:** `evalCPU` (preview), codegen (constants/uniforms in emitted WGSL —
  brief-owned), consumer packing.

### 2. Host / runtime inputs (injected)

- **What:** Per-frame or per-session values the graph reads but does not author as
  nodes — `time`, camera matrices, frustum, pointer ray, `planetRotation`, body
  radius, resource handles.
- **Schema source:** Standard graph **input ports** + input catalog in
  [inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md).
- **Storage:** Not in the graph document; bound by `runtime-cpu` / `runtime-webgpu`
  / host (`apps/scene-editor/`).
- **UI:** Optional read-only debug panels; not the graph inspector's main job.
- **Runtime:** Wired into generated shader bindings each frame.

### 3. Consumer uniform packing (derived)

- **What:** GPU-aligned structs (`PlanetParams`, lighting blocks, …) consumed by
  render passes.
- **Schema source:** **Layout map** derived from (1) and consumer contract — field
  order, alignment, scale tags (`freq`, `ratioR`, `pure`, … per
  [planet-shaping-pipeline-graph.md](../../planet-shaping-pipeline-graph.md)).
- **Storage:** GPU buffers; CPU mirror for upload.
- **UI:** **No** direct struct editor. Authors change **graph params** or **body
  params**; packing code maps to uniforms.
- **Runtime:** `toGpuPlanetParams()`-style functions; `uniformLayouts.ts`.

```
Author edits schema-backed params  →  validate  →  CPU value bag  →  packer  →  GPU uniform
         ↑                                              ↑
   Shared form generator                    Host inputs merged here
```

---

## Shared form generator

### Decision

**One Svelte form component family**, driven by `@virtual-planet/schema`
introspection (`fields()`, `fieldKind()`, `annotationsOf()`), shared across:

- `/scene` node editor (already: `SchemaForm.svelte`)
- Graph editor inspector (M9)
- Planet/body appearance where schema-driven (migration target)
- **Any shader's tunable uniforms** — a graph primitive, a self-describing WGSL
  fragment, or a raw ShaderToy-style effect. The scene editor's property panel and a
  shader's uniform form are **one mechanism over different schemas**: the shader/consumer
  declares params (primitive schema / WGSL frontmatter), the *same* generator renders the
  controls, and the validated value bag flows through the uniform packer (class 3 below)
  to the GPU block bound to that shader. This generality is the point — sending data to
  arbitrary shaders is the same job as editing a scene node, not a separate UI.

### Placement (pinned default)

| Phase | Location | Notes |
|-------|----------|-------|
| **Now** | `apps/scene-editor/src/lib/planet/components/SchemaForm.svelte` | Scene editor prior art |
| **M9** | Shared chrome (collapsible `Section`/`VerticalTabs`) → **`@virtual-planet/editor-ui`** (decided — both `apps/scene-editor/` and graph-editor import it; see [M-editor-ui-extraction](./briefs/M-editor-ui-extraction.md)). `SchemaForm`/`ParamForm` live there or in a thin `schema-ui` on top | Graph editor owns inspector; `apps/scene-editor/` imports the shared chrome |
| **Never** | `packages/graph`, `packages/compiler` | No Svelte in IR/compiler packages |

Enhance the generator incrementally (log slider, sections, labels from
`description`, `x-widget`) — do not fork `EditorParamSection` into a parallel
system. Port existing chrome (`EditorSuperSection`, `EditorParamSection`,
`EditorVerticalTabs`) for **layout only**; field metadata stays in schema.

### Widget mapping (minimum)

| `fieldKind` / annotation | Control |
|--------------------------|---------|
| `number` / `integer` + `x-extent` | Slider or number input |
| `x-widget: log` | Log slider (planet radius, wide dynamic range) |
| `boolean` | Checkbox |
| `enum` (literal union) | Select |
| `string` + `x-ref` | Path picker (scene) |
| `section` / `superSection` (primitive YAML or `x-section`) | Collapsible groups (M3 / frontmatter) |

Validation: `Value.Check` / `check()` from `@virtual-planet/schema` on commit;
invalid values surface in `ValidationPanel` (graph) or inline (scene).

---

## Converging `ParamSpec` and TypeBox

**M2 `ParamSpec` is a staging shape, not the long-term SSOT.**

Target:

- Primitive param definitions use **`@virtual-planet/schema` factories** (`quantity`,
  `extent`, `Type.Boolean`, …) with the same `x-*` keys as scene schemas.
- `NodePrimitive.params` becomes **`TSchema` object schema** or a thin wrapper
  `{ schema: TSchema }` — migration is a brief-owned breaking change when M9/M3
  need widgets and sections.
- M3 YAML frontmatter **merges into** that schema (widgets, units, ranges,
  `section` / `sections`) per [wgsl-parsing-and-codegen.md](./wgsl-parsing-and-codegen.md)
  — signatures supply mechanical types; YAML supplies UX metadata.

The active
[M3 brief](./briefs/M3-self-describing-wgsl.md) pins this convergence as a
one-time internal migration: `NodePrimitive.params` becomes a TypeBox object
schema and the staging `ParamSpec[]` is removed. Do not add an adapter or retain
both shapes after M3.

---

## Scale behavior & units (planet / GPU)

Authoring metadata must capture **how a value behaves when planet radius or units
change** — distinct from WGSL type:

| Tag | Meaning | Example |
|-----|---------|---------|
| `freq` | Multiplies unit direction | `voronoi_scale` |
| `ratioR` | × radius → metres relief | `voronoi_amplitude` |
| `R_ref` | Normalized to reference radius | rare absolute refs |
| `pure` | Dimensionless [0,1] or unitless mix | `sand_cutoff` |
| `flag` | 0/1 toggle | layer gates |
| `length` | Absolute metres | `radius` |

Carry tags as schema annotations (`x-scale-behavior` or documented `description`
convention until a factory exists). The **form** shows human units (`km` via
`x-scale`); the **packer** applies radius and body context when building GPU
structs. Tags belong in this ADR, not in the WGSL ADR.

---

## What we explicitly do not build

- Per-shader hand-maintained slider tables for new features (`paramEditorSchema`
  pattern for new code).
- A graph canvas control for raw `uniform` struct members or bind-group layouts.
- Duplicate param metadata in WGSL comments **and** TypeScript **and** YAML without
  merge rules (M3 merge is authoritative).
- Separate form generators for graph vs scene vs planet (one introspection path).
- Svelte components inside `@virtual-planet/graph` or `@virtual-planet/compiler`.

---

## Migration & milestones

| Milestone | This ADR requires |
|-----------|-------------------|
| **M3** | Remove staging `ParamSpec[]`; loader merges YAML widgets/sections into a TypeBox primitive param object schema |
| **M9** | `InspectorPanel` uses shared form generator; no handwritten per-primitive inspectors |
| **M9b** | Primitive `CodeView` edits ripple through same schema to inspector |
| **M13** | Planet shaping params expressed as graph primitives; retire or generate `paramEditorSchema` from schema |
| **Scene** | Continue `SchemaForm` + `nodeSchemas`; optionally import shared package from graph-editor |

**Legacy:** `paramEditorSchema.ts` + `AppearanceEditor` remain until M13 parity;
new parameters on the shaping path go through graph primitive schemas.

---

## Package boundaries

| Package | Role |
|---------|------|
| `@virtual-planet/schema` | TypeBox factories, `fields()`, validation, annotations |
| `@virtual-planet/graph` | `NodePrimitive` param schema (converge to TypeBox) |
| `packages/graph-editor` (or `schema-ui`) | `SchemaForm` / `ParamForm`, inspector shell |
| `apps/scene-editor/` | Scene forms today; imports shared form; body/planet hosts |
| `apps/scene-editor/params/` | Transitional GPU packing (`planetParams.ts`, `toGpuPlanetParams`) |
| `packages/compiler` | No UI; may read param defaults for codegen constants |

---

## Interfaces (conceptual — briefs pin exact types)

```ts
/** Walk a param object schema and render controls. Implementation: Svelte. */
interface ParamFormProps {
	schema: TSchema;
	value: Record<string, unknown>;
	onchange: (next: Record<string, unknown>) => void;
	/** Optional section layout from primitive metadata. */
	sections?: ParamSectionMeta[];
}

/** CPU-side bag after validation — input to evalCPU and packers. */
type ParamValues = Record<string, number | boolean | string>;

/** Maps validated param values + host inputs → GPU uniform bytes. Not a form concern. */
interface UniformPacker<TGpu> {
	pack(params: ParamValues, host: HostInputs, ctx: PackContext): TGpu;
}
```

Briefs for M9/M3/M13 must reference this ADR when defining public surfaces.

---

## Related docs

| Doc | Relationship |
|-----|--------------|
| [schema-and-primitives.md](./schema-and-primitives.md) | SSOT vision; primitive registration |
| [editor.md](./editor.md) | Inspector, schema-driven palette, section chrome |
| [wgsl-parsing-and-codegen.md](./wgsl-parsing-and-codegen.md) | M3 YAML + signatures (not form layout) |
| [briefs/M3-self-describing-wgsl.md](./briefs/M3-self-describing-wgsl.md) | Exact TypeBox convergence and YAML merge contract |
| [inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md) | Host/runtime input class |
| [parameter-and-form-schema-addendum.md](./parameter-and-form-schema-addendum.md) | Resource ports, host inputs, inspector vs `SchemaForm` (M9+) |
| [planet-shaping-pipeline-graph.md](../../planet-shaping-pipeline-graph.md) | Scale tags, uniform contract |
| [driven-fields-editor.md](../../specs/driven-fields-editor.md) | Scene field bindings (separate from scalar params) |
| `apps/scene-editor/.../SchemaForm.svelte`, `nodeSchemas.ts` | Current scene prior art |
| `apps/scene-editor/params/paramEditorSchema.ts` | Legacy — do not extend for new features |

---

## Change log

| Date | Change |
|------|--------|
| 2026-06-24 | Initial record: one schema SSOT, shared form generator, three param classes, ParamSpec→TypeBox convergence, no raw uniform UI |
| 2026-06-27 | Pin convergence to M3: remove `ParamSpec[]`; TypeBox object schema is the graph-param SSOT before M9 |
| 2026-06-27 | Addendum: resource/host input boundaries and inspector two-panel model ([parameter-and-form-schema-addendum.md](./parameter-and-form-schema-addendum.md)) |
