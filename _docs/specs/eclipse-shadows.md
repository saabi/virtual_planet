# Eclipse shadows — analytic umbra/penumbra without shadow maps

**Status:** proposal · **Scope:** `scene/` (occluder query + sun as extended source),
`gpu/wgsl/planet/` (obscuration in lighting), `render/` (uniform packing), tests ·
**Driver:** multi-body rendering needs bodies to block each other’s sunlight (moon
eclipses, planetary transits, ring-adjacent occlusion). Shadow maps break at
planetary scale; the project already uses analytic shadows for terrain relief.
**Related:** [terrain-self-shadows.md](../terrain-self-shadows.md),
[solar-system-model.md](solar-system-model.md),
[solar-system-scene.md](solar-system-scene.md),
[planetary-rings.md](planetary-rings.md) (ring↔planet shadows use the same ray-sphere
pattern),
[unified-scene-renderer.md](unified-scene-renderer.md).

## Decision

**Do not use bitmap shadow maps for body-to-body eclipses.** Instead, compute **solar
obscuration** at each shaded point: what fraction of the sun’s disk is visible after
spherical occluders (moons, planets, eventually the receiver’s own limb) are
accounted for.

Umbra and penumbra fall out naturally:

| Region | Obscuration | Visual |
|--------|-------------|--------|
| **Full sun** | 0% blocked | Normal direct lighting |
| **Penumbra** | partial overlap on the sun disk | Scaled direct sun (soft edge) |
| **Umbra** | 100% of sun disk blocked | Direct sun term → 0 (ambient/fill remain) |

This matches the terrain self-shadow philosophy in [`shadow.wgsl`](../../fe/src/lib/planet/gpu/wgsl/planet/shadow.wgsl)
(analytic geometry in the shader, no depth buffer) and the ring shadow notes in
[planetary-rings.md](planetary-rings.md) (ray–sphere / ray–plane tests, multiply into
the sun term).

## Two shadow layers (compose, don’t conflate)

Body eclipses and terrain relief operate at different scales and must **multiply**:

```
sun_factor = body_eclipse_factor × terrain_self_shadow_factor
```

1. **Body eclipse** (this spec) — another celestial sphere blocks part or all of the
   sun disk as seen from the surface point. Dominates at orbital scales (Luna-F on
   Ferro, Tempest transiting Sol from a moon).
2. **Terrain self-shadow** ([terrain-self-shadows.md](../terrain-self-shadows.md)) —
   local relief on the *focused* body blocks the (already partially eclipsed) sun
   along a short ray march. Dominates at surface scale.

Order: compute body eclipse first, then march terrain self-shadow toward the **same**
sun direction. Ambient / sky / scoped moon lights are **not** multiplied by body
eclipse unless explicitly modeled later.

## Geometry

### Extended sun (required for penumbra)

A **directional light with zero angular size** only produces hard shadows — there is
no geometric penumbra from solar disk size. Penumbra requires treating the star as a
**finite disk**:

- **Preferred:** point/area source at the star body’s world position with physical
  radius `R☉` (already in the toy preset: Sol `radiusMeters = 50_000 km`). Direction
  from surface point `P`: `ω = normalize(S − P)`; distance `d = |S − P|`; angular
  radius `α = asin(R☉ / d)` (clamp for numerical safety).
- **Migration note:** `sceneDocument.ts` v6 moves starlight from directional to a
  point at Sol; eclipse math assumes that path. Until then, increment 1 can use a
  synthetic sun disk around the directional vector (fixed small `α`) for development.

### Occluders

Each candidate body is a **sphere** `(C, R)` in world space (stand-ins today; non-spherical
bodies deferred). From `P`, the occluder subtends a disk in the plane perpendicular to
`ω`:

- Vector to occluder center: `v = C − P`
- Project onto the sun plane: component perpendicular to `ω`
- Angular radius of occluder: `β = asin(R / |v|)` (with horizon cull: skip if
  `dot(normalize(v), ω) ≤ 0` — body behind the sun direction from `P`)
- Offset of occluder disk center on that plane: derived from `v` (standard eclipse
  geometry)

### Solar obscuration function

For one occluder, compute **overlap area** between two disks of angular radii `α`
(sun) and `β` (occluder) separated by angular distance `δ` on the plane ⊥ `ω`.
Obscuration fraction:

```
occ = overlap_area(α, β, δ) / (π α²)   // clamp to [0, 1]
visibility = 1 − occ
```

Multiple occluders: combine obscuration on the sun disk (not independent min/max of
visibility). **MVP:** single strongest occluder only (largest `occ`). **Complete:**
union of occluder disks via iterative inclusion–exclusion or conservative max of
`occ` when disks don’t overlap on the sun plane.

Umbra at `P` is `visibility ≈ 0`; penumbra is `0 < visibility < 1`.

### Cone picture (equivalent formulation)

The umbra and penumbra are **cones in world space** cast by the occluder against
the extended sun. Intersecting those cones with the receiver sphere yields the shadow
regions. For rendering we **do not rasterize** cone footprints; per-point disk
overlap is the practical evaluation of the same physics.

## Scene integration

### Inputs per frame (receiver body `B`)

From `evaluateScene` + `getWorldTransform`:

| Input | Source |
|-------|--------|
| Star position `S`, radius `R☉` | `body` node with `bodyType: 'star'` (or primary point light parent) |
| Surface point `P` | Vertex/world position on receiver (planet-centered or ECEF — consistent with lighting) |
| Occluder list `(Cᵢ, Rᵢ)` | Scene query (below) |

### Occluder query (CPU, once per body per frame)

`collectEclipseOccluders(scene, receiverBodyId, t)` → ordered list capped at
`MAX_OCCLUDERS` (start: 4):

1. All **enabled** `body` nodes except the receiver (and optionally except the star
   when using point-sun disk at `S`).
2. **Broad-phase cull:** occluder’s angular separation from sun direction at receiver
   center < `(α + β + margin)`; distance sanity (not behind receiver’s horizon at
   sample — per-fragment cull still applies).
3. Sort by estimated peak obscuration (closest transits first); keep top N.

Pure function, unit-tested with toy system layouts (Luna-F eclipsing Ferro).

### GPU upload

Pack into a small uniform/storage block (mirror `CollectedLighting`):

```ts
interface EclipseOccluder {
  center: Vec3;      // world
  radius: f32;
}
interface EclipseSun {
  position: Vec3;
  radius: f32;
}
// + count, receiver id (debug), optional flags
```

WGSL: `body_eclipse_visibility(P, sun, occluders[], count) -> f32`.

Hook in [`cubeSphereVertex.wgsl`](../../fe/src/lib/planet/gpu/wgsl/terrain/cubeSphereVertex.wgsl)
where `terrain_sun_shadow` already runs — multiply factors before `evaluate_pbr`.

### Lighting

In [`lighting.wgsl`](../../fe/src/lib/planet/gpu/wgsl/planet/lighting.wgsl), the
direct sun term already accepts `sun_shadow`. Extend semantics:

- `sun_shadow` = `body_eclipse × terrain_self` (or pass separately and multiply
  once).
- **Shadow Fill** (`materialOverrides.shadowFill`) continues to lift *combined*
  direct shadow toward full sun — cheap fill light in umbra, not a physical second
  bounce.

Point/ scoped moon lights: **unshadowed** in MVP (same as terrain self-shadow today).

## MVP vs complete

| Area | MVP | Complete |
|------|-----|----------|
| **Sun model** | Point at Sol + physical `R☉`; or directional + fixed tiny `α` for dev | Luminosity × `1/d²` tied to star params; spectral disk (future) |
| **Occluders** | Spheres; one dominant occluder | Multiple occluders with disk union; gas-giant oblateness (optional) |
| **Penumbra** | Disk overlap (smooth) | Same + atmospheric forward scattering near umbra |
| **Receiver** | Sphere (eclipse on body ignores terrain bump silhouette) | Terrain silhouette on sun disk for close flybys (micro-eclipse) |
| **Scope** | Primary star only eclipses focused body | Mutual eclipses in multi-body pass; ring annulus occluder ([planetary-rings.md](planetary-rings.md)) |
| **Performance** | ≤4 occluders, CPU cull | Hierarchical cull; optional screen-tile reuse of visibility |
| **Editor** | No new toggles (always on when multi-body sun active) | Debug viz: umbra outline on map / wireframe cones |

## Why not shadow maps

- **Precision:** depth fighting and texel size at 10³–10⁹ m scales.
- **Penumbra:** filtering a shadow map approximates soft shadows; disk overlap is
  the correct physical model for a finite sun.
- **Consistency:** terrain already avoids maps; one analytic story for sun occlusion.

## Implementation plan

### Increment 0 — prerequisites (may overlap other tracks)

- [ ] Point sun at Sol in the toy preset + `collectLightsForBody` (scene document v6).
- [ ] Multi-body / focused-body render path can supply **world-space** surface
  positions and per-body lighting ([unified-scene-renderer.md](unified-scene-renderer.md)
  increment 2+).

### Increment 1 — hard eclipse (umbra only)

**Goal:** Moon fully blocks sun → direct light goes to zero on the night side of the
umbra; no penumbra yet.

- [ ] `scene/eclipseOccluders.ts` — query + cull + tests (synthetic two-body layouts).
- [ ] `scene/packEclipse.ts` — GPU struct packing.
- [ ] `gpu/wgsl/planet/eclipse.wgsl` — `ray_sphere_occludes(P, ω, C, R)` toward sun:
  if ray from `P` along `ω` hits occluder sphere before escaping to infinity (or
  before sun distance), factor = 0. Single occluder.
- [ ] Wire into cube-sphere vertex path; multiply with existing `terrain_sun_shadow`.
- [ ] Visual test: toy system, Ferro surface, Luna-F transit — umbra patch visible.

### Increment 2 — penumbra (extended sun)

**Goal:** Partial solar eclipses with smooth edges.

- [ ] Replace ray hit with `disk_obscuration(α, β, δ)` in `eclipse.wgsl` (document
  formula; reference implementation in TS for tests).
- [ ] Use real `R☉` and distance `d` for `α`.
- [ ] Tests: compare TS oracle vs WGSL for fixed layouts (headless numeric parity
  samples, not full GPU CI).

### Increment 3 — multi-occluder + integration polish

- [ ] CPU: up to N occluders, sorted; union or dominant-occluder policy.
- [ ] Surface-patch vertex path (same factor as cube-sphere).
- [ ] System map optional overlay: umbra outline at receiver (debug / preview).

### Increment 4 — extensions (deferred)

- Ring annulus as occluder (shared math with [planetary-rings.md](planetary-rings.md)).
- Receiver self-limb (partial sun when near space).
- Eclipse-driven ambient reddening (atmosphere pass, not geometric).

## Files (expected touch list)

| Area | Files |
|------|-------|
| Scene query | `scene/eclipseOccluders.ts`, `scene/eclipseOccluders.test.ts` |
| Packing | `scene/packEclipse.ts`, extend `types.ts` if needed |
| WGSL | `gpu/wgsl/planet/eclipse.wgsl`, `#include` from `cubeSphereVertex.wgsl`, `surfacePatchVertex.wgsl` |
| Lighting | `gpu/wgsl/planet/lighting.wgsl` (document combined factor) |
| CPU tests | `scene/eclipse.test.ts` — disk overlap oracle, toy system umbra centers |
| Spec cross-links | this doc, [terrain-self-shadows.md](../terrain-self-shadows.md) |

## Test plan

1. **Disk overlap oracle (TS)** — known cases: no overlap, tangent, half, full; `δ=0`
   nested disks.
2. **Occluder query** — Luna-F only candidate when illuminating Ferro; Sol excluded;
   distant planets culled at transit-free epochs.
3. **Toy system integration** — at a scripted `t`, surface points on Ferro facing Sol:
   center of Luna-F umbra → visibility `< 0.05`; far side → `≈ 1`.
4. **Parity spot checks** — TS oracle vs WGSL-exported function for N sample points
   (if/when `@group(…) compute` test hook exists; else CPU duplicate of WGSL math in
   tests).
5. **Composition** — umbra point with terrain self-shadow on: both factors multiply;
   shadow fill still applies once.

## Suggested authoring values (toy system)

Use existing radii from [`solarSystem.ts`](../../fe/src/lib/planet/scene/solarSystem.ts):

| Body | Radius | Eclipse role |
|------|--------|----------------|
| Sol | 50,000 km | Extended source disk |
| Luna-F | 120 km | Occludes Ferro (period 9 s — easy to scrub) |
| Ferro | 500 km | Receiver for first demo |
| Tempest | 7,000 km | Large occluder for gas-giant transit tests |

Scrub time on `/scene` until Luna-F aligns between Ferro and Sol for a visible
umbra on Ferro’s dayside.

## Related / deferred

- **Atmosphere in umbra** — geometric zero direct sun ≠ dark sky; Rayleigh scatter
  fills umbra (separate from shadow fill knob).
- **Eclipse on the star** — planet transiting Sol (exoplanet view) uses the same
  math with receiver = star photosphere mesh or disk sprite.
- **Barycentre wobble** — Sol already moves via sum driver; eclipse query uses live
  world transforms, no special case.
