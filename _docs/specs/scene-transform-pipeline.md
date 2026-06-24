# Scene transform pipeline — model matrices (intention)

**Status:** deferred design note · **Scope:** `/scene` scene-3d engine + procedural
compositing · **Not scheduled** — implement when a trigger below fires.

## Problem

The scene graph already composes **TRS** per node (`getWorldTransform` in
`lib/planet/scene/sceneTree.ts`). Downstream renderers **re-interpret** that state in
several ad-hoc ways:

| Drawable | Current application |
|----------|---------------------|
| Child nodes (bodies, lights) | Full world TRS via `getWorldTransform` |
| Orbit path overlays | `frame.position` + `transformOffset(frame, local)` (`orbitPaths.ts`) |
| Stand-in spheres | Eye-relative `T` + per-axis `diag(r·sx, r·sy, r·sz)` (`spherePass.ts`) |
| Procedural terrain | `planetRotation` quat + scalar `renderRadius = radiusMeters × max(sx,sy,sz)` (`proceduralRender.ts`, `proceduralBodies.ts`) |
| Atmosphere (scene pass) | Spherical `planet_radius` derived from the same scalar |

This works for catalog solar systems (mostly identity scale, spherical bodies) but
**non-uniform node scale on procedural bodies collapses to `max(sx,sy,sz)`** — stand-in
spheres can be ellipsoids, procedural planets cannot.

## Target architecture

**One model matrix per drawable** (or factored `mat3 linear + vec3 translation` for
floating-origin precision at AU scale):

```text
clip = viewProjection × modelMatrix × localPosition
```

- `modelMatrix` = evaluated world TRS for the owning scene node (same contract as
  `getWorldTransform`, optionally `× diag(radiusMeters)` for bodies).
- `viewProjection` stays eye-relative in `SceneViewport3D` (large translations rebased
  to the camera; see [scene-3d-viewport.md](scene-3d-viewport.md)).
- **Local geometry** stays in the node's own space: orbit samples, unit-sphere verts,
  procedural samples on unit directions.

### Procedural bodies (extra contract)

The terrain stack is **spherical by design** today (`sample_planet` in
`gpu/wgsl/planet/kernel.wgsl`: `world_pos = unit_dir × (radius + height)`; single
`PlanetParameters.radius`). A model matrix fixes **placement**, not the full ellipsoid
problem:

1. **Sample** noise on unit-sphere **body directions** (unchanged analytic contract in
   [celestial-body-params.md](celestial-body-params.md)).
2. **Displace** radially in body space (sphere or, later, along ellipsoid normal).
3. **Place** with `modelMatrix` (non-uniform scale → oblate/spheroid mesh).

Shader modules that assume one scalar radius and spherical raycasts must be updated in
tandem: terrain verts, normals, shadows, ideal-sphere fragment reconstruction, patch
LOD/culling, atmosphere (`ray_sphere_intersect` → ellipsoid or inverse-linear ray map).

## Phased implementation (when triggered)

| Phase | Work | Risk |
|-------|------|------|
| **A — scene-3d only** | `worldTransformToMat4()`; orbit lines + `SpherePass` take `modelMatrix`; drop `centerEye` + separate scale paths | Low |
| **B — procedural placement** | Pass `bodyModelMatrix` into scene composite + terrain `recordInto`; per-axis `radiusMeters × scale` on linear part | Medium |
| **C — ellipsoid-aware shading** | WGSL + atmosphere + scheduling ellipsoid contract; displacement along ellipsoid normal | High |

Do **not** start phase C until oblate/axis authoring or a shipped feature requires it.
Phase A alone is worthwhile when adding more transformed overlays (axes, rings, markers).

## Deferred — why not now (2025-06)

- Transform-on-geometry for orbits and uniform body scale **just landed**; let it bake
  in real scenes (SunDog systems, kepler editing) before another cross-cutting refactor.
- Catalog bodies use `radiusMeters` with identity scale; the pain point is narrow
  (authoring non-uniform scale on procedural LOD).
- Full matrix + ellipsoid touches sacred GPU contracts (`render/`, WGSL, atmosphere) —
  high regression cost during active scene/solar-system integration.

## Triggers — when to schedule

Implement **phase A** when any of:

- A third scene-geometry type copies TRS math (gizmos, rings, city preview, etc.).
- Transform bugs reappear from divergent orbit vs body vs overlay math.

Implement **phase B + C** when any of:

- Non-uniform body scale is a **first-class authoring** requirement (oblate gas giants,
  squashed moons, ellipsoid starports).
- `/planet` and `/scene` renderer unification needs one transform contract
  ([renderer-unification-plan.md](../renderer-unification-plan.md)).

## Related code

- `lib/planet/scene/transform.ts` — `transformOffset`, `transformPoint`, TRS compose
- `lib/planet/scene/orbitPaths.ts` — orbit `frame: WorldTransform`
- `lib/planet/scene3d/drawList.ts` — `worldScale` on draw items
- `lib/planet/scene3d/spherePass.ts` — per-axis instance scale
- `lib/planet/scene3d/proceduralRender.ts` — scalar `renderRadius`
- `lib/planet/render/buildRenderFrame.ts` — single `params.radius` scheduling

## Related specs

- [unified-scene-renderer.md](unified-scene-renderer.md) — scene engine frame
- [scene-procedural-rendering.md](scene-procedural-rendering.md) — compositing seam
- [scene-routing.md](scene-routing.md) — composable transform nodes
- [celestial-body-params.md](celestial-body-params.md) — scale-invariant noise contract
