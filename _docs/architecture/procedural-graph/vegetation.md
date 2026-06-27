# Procedural vegetation

**Status:** architecture · **Scope:** a vegetation consumer
(CPU module → WGSL compute), the cube-sphere `patches/` streaming budget,
vegetation primitives in `packages/procedural-wgsl`. Part of the
[Procedural Graph System](./README.md).

The first non-terrain consumer, and the origin of this whole design. Vegetation
is evaluated from deterministic 3D fields in **world-space metric coordinates** so
spacing and scale stay physically consistent regardless of planet radius and with
no distortion at poles or cube-face seams. Three concerns are kept independent:

1. **Streaming** — *which* surface is evaluated. Reuses the cube-sphere patch
   hierarchy purely as a compute/visibility budget. Cells outside the visible set
   simply don't exist; deterministic generation means discarded cells regenerate
   identically. Cells do **not** define ecosystem boundaries.
2. **Ecology** — *what* can grow. A **low-frequency** field (hundreds of m → km)
   defines habitat suitability: forests, grasslands, clearings, transitions.
3. **Placement** — *exactly where* an instance sits. A **high-frequency** field
   in metric space.

**RGB density / semantic channels.** The ecological field is multi-channel
(e.g. R=trees, G=shrubs, B=grass) representing *suitability*, extensible to RGBA
or stacked fields (moisture, fertility, season, species). Channels need not map
1:1 to species — a single channel can encode an ecological gradient (low→grass,
mid→shrub, high peaks→trees), since where trees dominate, grass does not.

**Peak-based placement (not per-pixel).** The high-frequency field is a
*candidate field*, not a binary occupancy mask. Instances spawn **only at local
maxima above threshold**, so many samples over threshold still yield one tree:

```wgsl
let v = placementNoise(p);
let isPeak = v > noise(p + tx*eps) && v > noise(p - tx*eps)
          && v > noise(p + ty*eps) && v > noise(p - ty*eps);
let prominence = v - maxNeighborValue;        // suppress soft plateaus
let spawnTree  = isPeak && prominence > minTreeProminence
              && v > treePlacementThreshold && density.r > treeDensityThreshold
              && slope < maxTreeSlope;          // + altitude band, etc.
```

Peak intensity can drive probability / vigor / size. Inter-tree spacing emerges
from placement frequency, sampling resolution, peak threshold, and an optional
suppression radius — no explicit metric-cell binning required.

**Coverage vs. instances.** The graph distinguishes continuous coverage (grass,
moss, sand, snow — evaluated continuously, e.g. `smoothstep(grassMax,grassMin,v)
* grassMicroNoise`, optionally masked by `1 - treeInfluence`) from discrete
instances (trees, shrubs, rocks, logs — produced via peak detection).

**Terrain constraints** (slope, altitude, curvature, exposure; future moisture /
drainage / temperature) filter accepted candidates, evaluated from the same
surface sampling the terrain shader uses.

**LOD.** Orbit → none; high altitude → statistical coverage; medium → impostors;
ground → full instances. Streaming keeps memory roughly constant; generation is
embarrassingly parallel (CPU workers first, then a WGSL compute consumer).
