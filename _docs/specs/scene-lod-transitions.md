# Scene LOD transitions (tessellation-only)

**Status:** implemented on `/scene`.

Planets and moons use a single tessellated mesh path — no instanced-sphere backing layer during zoom transitions.

## Screen-size bands

Thresholds are global (`SceneViewportPrefs.lod`), expressed as projected body radius in pixels.

| Band | Condition | Mesh | Displacement | Toggled channels |
|------|-----------|------|--------------|------------------|
| Dot | `px < meshStarts` | Point sprite | — | — |
| Smooth mesh | `meshStarts ≤ px < terrainStarts` | Cube-sphere, zero displacement | `0` | Off (see toggle) |
| Terrain ramp | `terrainStarts ≤ px < terrainFull` | Same mesh | `0→1` (always) | `0→1` if toggled |
| Full | `px ≥ terrainFull` | Full terrain | `1` | `1` if toggled |

UI labels: **Mesh starts** (`sphereAboveRadiusPx`), **Terrain starts** (`proceduralAboveRadiusPx`), **Terrain full** (`proceduralFullRadiusPx`).

## Transition mode

`lod.transitionMode`: `none` | `heights` | `atmosphere` | `both`

- **none** — no ramping; full displacement, height, and atmosphere from mesh tier up.
- **heights** — terrain band ramps vertex displacement + fragment macro relief; atmosphere on from smooth-mesh tier.
- **atmosphere** — terrain band ramps atmosphere opacity only; relief at full from smooth-mesh tier.
- **both** — terrain band ramps displacement, height, and atmosphere; both off during smooth-mesh tier.

Non-toggled channels are at full strength once the smooth-mesh tier begins.

`fadeGamma` shapes the terrain-band curve (same semantics as the former opacity cross-fade).

## Implementation

- CPU: `resolveLodTransitionBlends()` in `apps/scene-editor/src/lib/planet/scene/bodyParams.ts`
- Draw list: `dot | mesh` + per-channel blends in `apps/scene-editor/src/lib/planet/scene3d/drawList.ts`
- GPU: `height_blend` / `displacement_blend` in `MaterialOverrides` (WGSL terrain shaders)
- Atmosphere: per-body `opacity` in `SceneAtmospherePass`, decoupled from terrain alpha

`/planet` is unchanged: full displacement, opaque terrain, full atmosphere.
