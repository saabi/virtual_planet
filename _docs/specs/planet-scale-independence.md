# Planet scale independence (meteor → star)

**Status:** proposal · **Author:** design pass · **Scope:** `params/`, `gpu/wgsl/planet/`, `patches/` LOD gating, `documents/` migration

## Goal

Author one planet "shape" and have it render correctly at any size — from a
~10 m meteor to a Jupiter (≈ 7×10⁷ m) or a star (≈ 7×10⁸ m). Today the radius
slider is **linear 0–3000** and several terrain controls are **absolute meters**,
so a shape tuned at radius 100 breaks completely at radius 10⁷.

## Core principle: separate **Scale** from **Shape**

| Bucket | Meaning | Units | Examples |
|--------|---------|-------|----------|
| **Scale** | How big the body is | absolute meters (log) | `radius` |
| **Shape** | What the body looks like, independent of size | ratios / cycles-per-sphere / 0–1 fractions / direction fields | relief ratios, noise frequencies, biome bands, water level, climate axes |

The shader multiplies *ratios* by `radius` at evaluation time. A "Shape" preset
(e.g. *earth-like*) then renders identically at any `radius`. This is the single
organizing idea; everything below follows from it.

## Audit of current parameters

Evaluated in `kernel.wgsl::sample_planet` and `material.wgsl::surface_material`.

| Param | Today | Scale-dependent? | Fix |
|-------|-------|------------------|-----|
| `radius` | absolute m, slider 0–3000 linear | n/a (it *is* the scale) | **log slider**, 1 m – 1e9 m |
| `voronoi_scale`, `detail_scale`, `voronoi_distortion_scale` | multiply `unit_dir` (unit sphere) | **No** ✓ (cycles per sphere) | keep |
| `voronoi_amplitude`, `detail_amplitude` | absolute m of relief | **Yes** ✗ | → **relief *ratio*** (× radius in shader) |
| `voronoi_distortion_amplitude` | domain offset in voronoi space | No ✓ | keep |
| `texture_noise_scale` | multiplies **`world_pos`** (absolute) | **Yes** ✗ | sample on `unit_dir`, not `world_pos` |
| `texture_noise_amplitude` | absolute m added to height | **Yes** ✗ | → relief ratio |
| `water_level` | fraction of total amplitude | No ✓ | keep |
| `sand_cutoff`, `vegetation_level`, `snow_cover` | fraction of normalized height | No ✓ | keep |
| `erosion` | power exponent | No ✓ | keep (but see bug below) |
| `polar_scale` | `abs(y)/radius` threshold | No ✓ | keep |
| `polar_amplitude` | absolute m added to height | **Yes** ✗ | → relief ratio |
| albedos, flags | 0–1 / bool | No ✓ | keep |

So the **only genuinely radius-dependent knobs** are the five relief/amplitude
values and `texture_noise_scale`. Converting those to ratios makes a Shape
size-agnostic.

## Concrete changes

### 1. Radius as a log control
- New control type or reuse the existing `LogRange` (already used for altitude).
- Range **1 m – 1×10⁹ m**, with snap presets surfaced in the UI:
  *Meteor (1 km) · Moon (1.7e6) · Earth (6.37e6) · Jupiter (7e7) · Sun (7e8)*.
- `radius` stays absolute meters in `PlanetParameters` (no migration of the field
  itself, just the slider).

### 2. Relief as ratios
Replace absolute amplitudes with **relief ratios** (relief ÷ radius):

```
voronoi_amplitude      → continent_relief   (ratio, e.g. 0–0.1; Earth ≈ 0.003)
detail_amplitude       → detail_relief       (ratio)
texture_noise_amplitude→ texture_relief      (ratio, tiny)
polar_amplitude        → polar_relief         (ratio)
```

Shader: `let amp = ratio * params.radius;` then the existing math is unchanged.
Sliders become radius-independent (e.g. relief ratio 0–0.1, log within that for
fine meteor-vs-mountain control).

> Earth reference for sane defaults: relief ≈ 20 km on 6371 km ⇒ ratio ≈ 0.003.
> Mars ≈ 0.006 (Olympus Mons). A "dramatic" world ≈ 0.02–0.05.

### 3. Texture noise on the unit sphere
`material.wgsl:77` samples `fbm_4(sample.world_pos * sqrt(texture_noise_scale))`.
`world_pos` is `unit_dir·(radius+height)` — absolute, so micro-texture frequency
explodes with radius. Change to sample `unit_dir` (like every other layer), with
`texture_noise_scale` meaning cycles-per-sphere. Keep a high default frequency so
it still reads as micro-detail.

### 4. LOD gating must scale with radius
`kernel.wgsl::should_eval_layer(min_mpp, scale)` gates layers on **absolute**
`meters_per_pixel` thresholds (50 / 200 / 500 / 1000). A feature that subtends N
pixels does so at a `meters_per_pixel` proportional to its **world size**, which
scales with radius. So on a Jupiter the macro voronoi turns on/off at the wrong
distance. Make the thresholds **relative to radius** (or to the feature's world
wavelength):

```
should_eval_layer(rel, scale, params)  // gate when meters_per_pixel <= rel * radius
```
or, better, gate per layer on its own wavelength: a layer of `k` cycles/sphere has
wavelength ≈ `2π·radius/k`; evaluate it while `meters_per_pixel ≲ wavelength /
target_samples`. This also fixes the surface-texture layer turning off too early
on large bodies.

### 5. Fix the erosion normalization scale bug
`kernel.wgsl:59`, underwater branch: `thf = wl - params.radius`. With large
`radius` this is a huge negative number, so `th/thf → 0` and the erosion remap
degenerates (ocean floors flatten to nothing) at planetary scale. `thf` should be
expressed in the same normalized/relief units as the above-water branch
(`total_amplitude - wl`), e.g. `thf = wl + total_amplitude` or a relief-relative
floor — to be derived when relief becomes a ratio.

## Migration

Converting absolute amplitudes → ratios is a **breaking change** to
`PlanetParameters`, so it needs a snapshot migration (the `documents/` system
already has `migrate.ts` + `CURRENT_SNAPSHOT_VERSION`):

1. Bump `CURRENT_SNAPSHOT_VERSION`.
2. `migrate vN→vN+1`: for each stored snapshot, `ratio = absolute_amplitude /
   max(stored_radius, 1)`. Built-in presets are rewritten in ratio form directly.
3. `schema.ts::coerce*` + `presets.ts` updated to the new fields.

## Phasing

1. **Radius log slider + named scales** (no semantic change) — immediate usability.
2. **Relief ratios** (amplitudes → ratios) + migration — the core fix.
3. **Texture-noise-on-unit-dir** + **erosion `thf` fix** — small, high-value.
4. **Radius-relative LOD gating** — needed before very large/small bodies look
   right at all zooms.

Items 1–3 make existing Earth-scale shapes work across the full size range; 4 is
required for crisp LOD on extreme sizes.

## Related
See [climate-fields-and-planet-types.md](climate-fields-and-planet-types.md) for
the orthogonal axis: more *kinds* of planets (tidally-locked, gas giants, stars)
via orientable climate fields and an exposed material palette.
