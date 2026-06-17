# Current renderer baseline (`/old`)

Phase 0 notes for the legacy planet editor preserved at **`/old`** in the SvelteKit app. This route is frozen as a visual reference while the WebGPU renderer is built at **`/planet`**.

## Stack

| Piece | Location |
|-------|----------|
| UI + parameter controls | `fe/src/lib/old/components/PlanetDisplay.svelte` |
| Three.js canvas + render loop | `fe/src/lib/old/components/ThreeView.svelte` |
| Vertex shader (terrain displacement) | `fe/src/lib/old/shaders/planet.vert` |
| Fragment shader (material / water) | `fe/src/lib/old/shaders/planet.frag` |
| Presets (JS, snake_case) | `fe/src/lib/old/planet-editor/sample-planets.js` |

## Rendering model

- **Polar grid mesh** — vertices indexed by `aIdx` on a latitude/longitude-style patch grid; not cube-sphere.
- **Single instanced draw** — one base patch topology, rotated/scaled via uniforms (`angle`, `radius`, `ares`).
- **Shader-centric planet** — `samplePlanet` lives inline in `planet.vert` / `planet.frag` (hash, Voronoi, fBM, erosion, water level).
- **Three.js + OrbitControls** — camera orbit; mesh rotation used for planet orientation.
- **Quality knobs** — `resx` / `resy` patch resolution, `multisampling`, `smoothShading`.

## Presets

Seven named presets: `starter`, `twirly`, `desert`, `archipelago`, `frozen`, `craters`, `normie`. Typed equivalents live in `fe/src/lib/planet/params/presets.ts` (camelCase `PlanetParameters`).

## Debug toggles (UI)

Wireframe, normals view, water on/off, illumination, sampling controls — all wired through `PlanetDisplay.svelte` uniforms.

## What the new renderer replaces

Per [_docs/specs/virtual_planet_architecture_plan.md](specs/virtual_planet_architecture_plan.md):

- Polar `aIdx` grid → cube-sphere patches (orbit) + surface carpet (near ground).
- Global float coordinates → CPU double ECEF + GPU local frame.
- Three.js as architecture center → `RenderBackend` with WebGPU primary path.
- `OrbitControls` on `/planet` → custom camera modes.

## Regression rule

Architecture work must not change `/old` visuals. Wave 1 GLSL modularization may touch `fe/src/lib/old/shaders/*` only if output is pixel-identical.

## Screenshots

Baseline captures (orbit, wireframe, normals, water on/off, presets) to be added under `_docs/screenshots/wave-0/` when captured manually.
