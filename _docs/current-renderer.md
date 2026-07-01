# Historical renderer baseline

Phase 0 notes for the retired Sapper/WebGL planet editor. Its source was removed during the
World Lab open-source cleanup; use git history when the old implementation is needed for
archaeology. `/old` and `/planet` now redirect to `/scene`.

## Stack

| Piece | Historical location |
|-------|----------|
| UI + parameter controls | Removed legacy Sapper app |
| Three.js canvas + render loop | Removed legacy Sapper app |
| Vertex shader (terrain displacement) | Removed legacy Sapper app |
| Fragment shader (material / water) | Removed legacy Sapper app |
| Presets (JS, snake_case) | Removed legacy Sapper app |

## Rendering model

- **Polar grid mesh** — vertices indexed by `aIdx` on a latitude/longitude-style patch grid; not cube-sphere.
- **Single instanced draw** — one base patch topology, rotated/scaled via uniforms (`angle`, `radius`, `ares`).
- **Shader-centric planet** — `samplePlanet` lives inline in `planet.vert` / `planet.frag` (hash, Voronoi, fBM, erosion, water level).
- **Three.js + OrbitControls** — camera orbit; mesh rotation used for planet orientation.
- **Quality knobs** — `resx` / `resy` patch resolution, `multisampling`, `smoothShading`.

## Presets

Seven named presets: `starter`, `twirly`, `desert`, `archipelago`, `frozen`, `craters`, `normie`. Typed equivalents live in `apps/scene-editor/src/lib/planet/params/presets.ts` (camelCase `PlanetParameters`).

## Debug toggles (UI)

Wireframe, normals view, water on/off, illumination, sampling controls — all wired through `PlanetDisplay.svelte` uniforms.

## What the new renderer replaces

Per [_docs/specs/virtual_planet_architecture_plan.md](specs/virtual_planet_architecture_plan.md):

- Polar `aIdx` grid → cube-sphere patches (orbit) + surface carpet (near ground).
- Global float coordinates → CPU double ECEF + GPU local frame.
- Three.js as architecture center → `RenderBackend` with WebGPU primary path.
- `OrbitControls` on `/planet` → custom camera modes.

## Historical status

The old visual-regression rule no longer applies because the implementation and route were
retired. Current renderer gates are documented in `AGENTS.md`.

## Screenshots

Baseline captures (orbit, wireframe, normals, water on/off, presets) to be added under `_docs/screenshots/wave-0/` when captured manually.
