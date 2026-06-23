# Per-body appearance — the `CelestialBody` params model

**Status:** model/editor implemented; multi-body procedural rendering still later.
**Scope:** scene bodies carry procedural appearance (`PlanetParameters` preset +
overrides) and body atmosphere, so they can be rendered/edited as real planets.
**Related:** [renderer-unification-plan.md](../renderer-unification-plan.md),
[body-vs-viewport-state.md](body-vs-viewport-state.md), the `/planet` renderer +
`params/`.

## Problem

Earlier scene bodies were stand-ins with only `bodyType`, `radiusMeters`, and `standIn`.
They now carry optional `appearance`, `atmosphere`, and `lod` fields. The remaining
problem is no longer the data model; it is generalizing the renderer from one selected
procedural body to multiple procedural bodies plus atmospheres in the scene pass.

## Model

A body gains an optional **appearance**: a preset reference plus sparse overrides —
not a full inlined param block. Compact, shareable across bodies, and override-diff is
what the editor writes.

```ts
interface BodyAppearance {
  preset: PlanetPresetName;          // a built-in template (starter, desert, frozen, …)
  overrides?: Partial<PlanetParameters>; // sparse per-body tweaks
}
// on BodyNode:  appearance?: BodyAppearance
```

**Resolve** (`scene/bodyParams.ts`, pure + tested):

```ts
resolveBodyParams(body: BodyNode): PlanetParameters
//  = { ...PLANET_PRESETS[body.appearance.preset], ...overrides }
```

- **Radius (resolved — see [renderer-unification-plan.md](../renderer-unification-plan.md)
  §3.1/§5):** the terrain is **scale-invariant** (noise on `unit_dir`, amplitudes as
  ratios of radius), so a body renders at world scale by setting `params.radius =
  radiusMeters` at render time. There is **no separate render-space radius**; the
  preset's `radius` (~100) is only an **authoring reference** `R_ref` used to normalize
  layers not yet expressed as unit-direction frequencies (fine texture noise) and to
  normalize atmosphere strength. `resolveBodyParams` returns the preset's radius (the
  reference); the renderer overrides it with `radiusMeters`. *(An earlier draft called
  these "two distinct radii kept separate" — superseded: there is one render radius.)*
- **Default appearance:** absent → `DEFAULT_PRESET` (and unknown name → default too),
  so existing bodies resolve without migration.
- **Scope by body type:** only `planet` / `moon` carry terrain appearance. `star` /
  `gas_giant` stay stand-ins (emissive / banded spheres — their own appearance models
  are later); the editor shows "no designer yet" for them, as today.

## Editor

A **Appearance** section in the `/scene` node editor for planet/moon bodies: a
**preset picker** + the existing `paramEditorSchema` sliders editing
`appearance.overrides` (a tweak writes the diff vs the preset; "reset" clears it).
This reuses the param-editor schema that already drives `/planet`'s panel — no new
slider UI.

## Rendering & LOD

Rendering is **per-body screen-size LOD**, not one "focused" body. Each frame, every
visible body's projected size (px) picks its representation, with hysteresis to avoid
flicker at the boundary:

- **dot** (sub-pixel / a few px) — a point/billboard;
- **sphere** (small–medium) — the current scene-3d shaded sphere;
- **procedural** (large — fills meaningful screen area) — the full `/planet` pipeline
  (terrain patches + atmosphere), fed `resolveBodyParams(body)`.

**Several bodies may be procedural at once** — the body you're on *plus* any others
large enough — so from a moon's surface its gas-giant primary renders procedurally,
through its atmosphere. The thresholds are an **`lod` policy on the body** (editable in
the tree — the "LOD node" idea), e.g. `{ proceduralAbovePx, sphereAbovePx }`.

This is the project's multi-scale promise, and a major rendering arc with real
prerequisites (well beyond the model in this spec):

- **Multi-body procedural rendering** — generalize the backend (today: one planet) to
  draw N procedural bodies + atmospheres in one frame, depth-composited.
- **Floating origin** — rebase the render origin to the camera each frame so Float32
  spans cm-at-surface *and* ~1e8 m inter-body (the existing `localFrame` rebasing,
  applied per camera). This is what makes "moon surface + distant gas giant" precise.
- **Unified camera** — one camera in system space, orbit *or* near-surface; LOD +
  floating origin do the rest. Reuses `/planet`'s surface camera modes.
- **A procedural-body budget** — how many bodies may be procedural simultaneously.

Reusing `/planet` means parameterizing `PlanetViewport` to accept external params +
emit changes (rather than owning preset state), and lifting its single-planet pipeline
toward multi-body — the main integration cost, taken incrementally.

## Decisions to confirm

1. **Storage:** preset + sparse overrides is implemented.
2. **Radius:** `resolveBodyParams()` returns the authoring preset radius, but procedural
   render inputs overwrite `params.radius = body.radiusMeters`. The rendered planet has
   one physical/render radius; preset radius is the `R_ref` authoring reference.
3. **Focused-body editing:** `/scene` can hand a body to `/planet` and round-trip edits
   back through the handoff link.
4. **Body types:** only planet/moon get terrain appearance now; star/gas_giant stay
   stand-ins until their own appearance models exist.

## Phasing

1. **✅ Model + resolve** — `BodyAppearance` (+ `lod` policy) on `BodyNode`;
   `resolveBodyParams` (pure, tested); default preset.
2. **✅ Appearance editor** — `AppearanceEditor`: preset picker + override sliders
   (reused from `PARAM_EDITOR_SECTIONS` shape/materials) writing `appearance.overrides`
   (overridden rows flagged; one-click reset) + the `lod` thresholds, in the `/scene`
   editor for planet/moon.
3. **✅ Screen-size LOD selection** — `SceneViewport3D` computes each body's projected
   px diameter and picks dot/sphere via `selectLod` (procedural drawn as a sphere for
   now); sub-threshold bodies render as fixed-size points, with ±15% per-body
   hysteresis. Off-screen bodies culled.
4. **✅ First procedural terrain body in shared depth** — selected planet/moon terrain
   records through the `/planet` pipeline into the `SceneEngine` render pass; its sphere
   is skipped while terrain is active.
5. **Next** — procedural atmosphere in the shared scene pass.
6. **Multi-procedural + atmosphere + near-surface camera** — N procedural bodies, their
   atmospheres, the unified camera. The "gas giant from a moon's surface" milestone.

Start with (1): pure model + resolver + tests, unblocks everything, touches no
rendering. The rendering arc (3–5) is large and lands incrementally.
