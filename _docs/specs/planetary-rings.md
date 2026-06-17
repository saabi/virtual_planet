# Planetary rings (future)

**Status:** note + method survey · not scheduled · **Scope:** a new render object,
mostly orthogonal to the procedural surface

Rings are deferred because they're a **different 3D object** — a thin, transparent
disk in the planet's equatorial plane — not a variation of the procedural sphere
surface. This doc records the shape, the candidate rendering methods, and how they
reuse what already exists, so the work is well-understood when scheduled.

## What a ring system is

- A flat **annulus** in the equatorial plane: inner radius → outer radius.
- **Radially structured**: density/opacity and colour vary almost entirely with
  *radius* (bands, gaps like Saturn's Cassini division), barely with angle. So the
  structure is effectively a **1D radial function** (procedural or a 1D texture) —
  cheap.
- **Semi-transparent**: you see the planet, sky, and the far side of the ring
  through it.
- **Two-sided**: visible lit from above or below.

### Scale-independent & orientation (reuse existing systems)
- Inner/outer radius as **ratios of planet radius** (e.g. 1.2–2.3 × R) → works at
  any planet size, consistent with the [scale-independence](planet-scale-independence.md)
  plan.
- Orientation = the planet's **axial-tilt quaternion** (rings lie in the equatorial
  plane and tilt with the axis). They do *not* follow the planet's spin — ring
  particles orbit independently; a static or slowly-rotating radial texture reads
  fine.
- Lighting reuses the existing **sun direction**.

## Rendering — method options

**A) Transparent ring mesh (recommended).**
A two-sided annular disk mesh (a triangle ring, or even a single quad clipped to
the annulus in the shader) in the equatorial plane, oriented by the tilt quat.
- Fragment shader samples the **1D radial profile** (procedural noise + a few
  named gaps, or a texture) → `opacity`, `colour`.
- Drawn in a **transparent pass after** opaque terrain + atmosphere, **alpha-blended**,
  **depth-tested** against the terrain depth so the half of the ring behind the
  planet is correctly occluded and the near half blends over the planet/sky. A
  thin single-layer disk needs no back-to-front sorting.
- Simplest path, looks right, integrates with the existing depth buffer.

**B) Analytic ring in the fullscreen/atmosphere pass.**
Intersect each view ray with the ring plane analytically (`ray ∩ plane`, then
radial in/out test), sample the radial profile, composite in the existing
fullscreen pass — no mesh. Elegant and resolution-independent, but occlusion
(ring behind planet) must be handled against scene depth manually, and it competes
with the atmosphere compositing. Good later optimization; A is the pragmatic start.

**C) Billboard/impostor** — too limited (no correct perspective/occlusion). Skip.

## Level of detail: annulus → particle field

A flat textured annulus is right from orbit, but the rings are physically a
**swarm of metre-to-boulder-scale ice/rock chunks** in an extremely thin sheet
(Saturn: ~tens of metres thick over ~10⁵ km radius). Up close the flat disk
should resolve into discrete tumbling masses — the same orbit↔surface LOD problem
the planet already solves, applied to the ring.

**Two-tier model with a blend band (mirrors the planet's mode blend):**

- **Far (orbital):** method A/B above — flat radial-profile annulus. Cheap, correct
  silhouette and shadows.
- **Near (within ~a few ring-thicknesses, or flying through):** resolve into
  **procedurally-placed particles**. Suggested methods, cheapest first:
  - **Instanced impostors / low-poly chunks** seeded by a deterministic hash of
    the ring cell (no storage — same trick as procedural terrain): position within
    a thin slab, size from a power-law distribution, random tumble orientation.
    **Local density and existence probability come from the same 1D radial profile**
    (gaps stay empty), so far and near agree by construction.
  - **Volumetric near-field** — ray-march a thin slab of 3D density noise for the
    granular, self-shadowing look when the camera is *inside* the ring plane. More
    expensive; best reserved for fly-through moments.
- **Blend:** cross-fade the annulus opacity down as particle coverage fades in over
  a distance band, so there's no pop — exactly like the cube-sphere↔surface
  handoff. The annulus still provides the bulk/silhouette behind the resolved
  particles.

**Consistency:** drive both tiers from the shared radial profile (density,
gaps, colour) and the tilt orientation, so the particle field is just a
higher-resolution realization of the same disk. Particle **lighting** reuses the
ring lighting below (sun + phase + planet shadow), plus inter-particle
**self-shadowing** in the volumetric case. Sizes/density distribution become
parameters (boulder scale, packing, slab thickness — all ratios where possible).

This is strictly heavier than the far annulus, so it's a later sub-phase of the
ring work — but the architecture (shared radial profile + hash-placed instances +
blend band) is the same pattern already used for the planet surface.

## Lighting & shadows (all cheap analytic tests)

1. **Ring brightness** — scale by sun illumination and a **phase function** of the
   sun/view angle (rings brighten at back-scatter / opposition), plus the radial
   opacity. A simple Henyey-Greenstein or `1 + cosθ` term is enough.
2. **Planet shadow on the rings** — for a ring point, test whether the ray toward
   the sun hits the planet sphere (one `ray_sphere_intersect`, already available);
   if so, darken. This is the dramatic shadow the planet casts across the night
   side of the rings.
3. **Ring shadow on the planet** — for a terrain surface point, test whether the
   line to the sun crosses the ring annulus: intersect that ray with the ring
   plane, check the hit radius is within [inner, outer], sample ring opacity →
   attenuate the sun term. This plugs into the terrain lighting exactly like the
   existing self-shadow factor (multiply the directional sun contribution), and
   gives Saturn's ring-shadow band on the planet.

All three are a handful of dot products / one ray-sphere / one ray-plane — no new
passes beyond the transparent ring draw itself.

## Parameters (when built)

`ring_enabled`, `ring_inner_ratio`, `ring_outer_ratio`, `ring_opacity`,
`ring_color` / palette, radial-structure controls (gap positions/widths, noise
scale), `ring_tilt` (default = planet axial tilt). All ratios/fractions →
scale-independent.

Particle-LOD sub-phase adds: `ring_thickness` (ratio), particle `boulder_scale` /
size distribution, packing density, and the annulus↔particle blend distance.

## Why later

It needs a **new transparent render pass** and ring↔planet shadow plumbing, and it
delivers no new *surface* capability — so it sequences after the surface/climate
and scale work. Tracked here so the eventual implementation is a known quantity.

## Related
- [climate-fields-and-planet-types.md](climate-fields-and-planet-types.md) — the
  surface model (tides, moons, archetypes); moons introduced there are also the
  natural place for ring **shepherd**/companion bodies later.
- [planet-scale-independence.md](planet-scale-independence.md) — ring radii as
  ratios of planet radius.
