# Per-body appearance — the `CelestialBody` params model

**Status:** proposal · **Scope:** give scene bodies a procedural appearance
(`PlanetParameters`) so they can be rendered/edited as real planets. A
`scene/bodyParams.ts` resolver + a body schema + the editor wiring; later, the
procedural render path. **Related:** [scene-routing.md](scene-routing.md) (phasing
item 4, "per-body params + body-editor view"), [scene-3d-viewport.md](scene-3d-viewport.md)
(Phase 4 procedural upgrade), the `/planet` renderer + `params/`.

## Problem

Scene bodies are stand-ins: `BodyNode = { bodyType, radiusMeters, standIn }` — no
appearance. So the 3D viewport draws flat spheres, and "open in the planet editor" is
a dead link. The `/planet` renderer is driven by `PlanetParameters` (radius + voronoi
/ detail noise, water, erosion, biomes, …) with named `PLANET_PRESETS`. The missing
link is **how a body carries its `PlanetParameters`** — the prerequisite for both
procedural bodies in 3D *and* the per-body editor.

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
//  = { ...PLANET_PRESETS[body.appearance.preset], ...overrides, radius: body.radiusMeters }
```

- **Radius has one source of truth:** `body.radiusMeters` (orbits, spheres, the map
  use it). It overwrites `PlanetParameters.radius` at resolve time — never stored
  twice, never drifts.
- **Default appearance:** absent → a sensible default preset (e.g. `DEFAULT_PRESET`),
  so existing bodies render without migration.
- **Scope by body type:** only `planet` / `moon` carry terrain appearance. `star` /
  `gas_giant` stay stand-ins (emissive / banded spheres — their own appearance models
  are later); the editor shows "no designer yet" for them, as today.

## Editor

A **Appearance** section in the `/scene` node editor for planet/moon bodies: a
**preset picker** + the existing `paramEditorSchema` sliders editing
`appearance.overrides` (a tweak writes the diff vs the preset; "reset" clears it).
This reuses the param-editor schema that already drives `/planet`'s panel — no new
slider UI.

## Rendering path

Two tiers, to bound cost (N full planet renderers is not viable):

1. **System 3D view stays spheres.** Cheap; many bodies. (Later LOD: the *focused*
   body upgrades sphere → procedural — scene-3d Phase 4.)
2. **Focused body rendered procedurally** by the **existing `/planet` pipeline**, fed
   `resolveBodyParams(body)`. Two ways to surface it (a **decision**): embed the
   `PlanetViewport` inline in `/scene` for the selected body, or navigate to `/planet`
   with the body's params loaded (today's stub link, upgraded to carry params).

Reusing `/planet` means parameterizing `PlanetViewport`/`PlanetEditorPanel` to accept
external params + emit changes, rather than owning their own preset state — the main
integration cost.

## Decisions to confirm

1. **Storage:** preset + sparse overrides (recommended) vs full inline `PlanetParameters`.
2. **Radius:** `radiusMeters` authoritative, `params.radius` derived (recommended).
3. **Focused-body view:** embed `PlanetViewport` inline in `/scene` (recommended — stays
   in scene context) vs link out to `/planet` with params.
4. **Body types:** only planet/moon get appearance now; star/gas_giant stay stand-ins
   (recommended).

## Phasing

1. **Model + resolve** — `BodyAppearance` on `BodyNode`; `resolveBodyParams` (pure,
   tested); default preset; doc-version bump. No UI. Self-contained `lib/`.
2. **Appearance editor** — preset picker + override sliders (reuse `paramEditorSchema`)
   in the `/scene` editor for planet/moon.
3. **Focused-body procedural render** — parameterize `PlanetViewport`; embed (or link)
   it for the selected body, fed `resolveBodyParams`.
4. **(Later) procedural in the system view** — sphere→procedural LOD for the near body;
   multi-body convergence (scene-3d Phase 4).

Start with (1): pure model + resolver + tests, unblocks 2–4, touches no rendering.
