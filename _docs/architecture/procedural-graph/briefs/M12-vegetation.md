# Brief — M12: Vegetation consumer (phased)

**Milestone:** M12 ([implementation-plan.md](../implementation-plan.md)) ·
**Packages:** `@virtual-planet/runtime-cpu` first; `runtime-webgpu` and
`graph-editor` in later pinned phases · **Depends on:** M11 ✅ and the graph/WGSL
standard-library streams (`0a06cb4`, `3536b81`, `8081af5`, `7e82082`) ·
**Design authority:** [vegetation.md](../vegetation.md),
[inputs-cpu-and-resources.md](../inputs-cpu-and-resources.md) ·
**Contract author:** Codex · **Recommended executor:** Cursor/Codex.

## Objective

Implement the first non-terrain procedural consumer without special-casing
vegetation in Graph IR. The consumer samples deterministic graph-derived fields in
world-space metric coordinates:

1. a low-frequency RGB ecology field describes habitat suitability;
2. a high-frequency scalar placement field supplies discrete local maxima;
3. terrain constraints filter candidates;
4. continuous coverage remains separate from discrete instances.

M12 is serialized into three phases. Only M12.1 is implementation-ready in this
brief. M12.2 and M12.3 receive separate pinned public contracts after M12.1 lands.

## M12.1 — deterministic CPU candidate generation

### Files

- `packages/runtime-cpu/src/vegetation.ts` *(new)*
- `packages/runtime-cpu/src/vegetation.test.ts` *(new)*
- `packages/runtime-cpu/src/index.ts` — re-export *(update)*

No graph/compiler, renderer, editor, or WGSL changes.

### Public surface

```ts
import type { Vec3 } from './camera.js';

export type Density3 = readonly [number, number, number];
export type VegetationChannel = 0 | 1 | 2;

/** A metric-space rectangular patch. origin is its minimum x/y corner. */
export interface VegetationPatch {
	id: string;
	origin: Vec3;
	tangentX: Vec3; // unit vector
	tangentY: Vec3; // unit vector, orthogonal to tangentX
	widthMeters: number;
	heightMeters: number;
}

export interface TerrainSample {
	altitudeMeters: number;
	slope: number; // dimensionless rise/run
}

export interface VegetationCandidateConfig {
	spacingMeters: number;
	channel: VegetationChannel;
	placementThreshold: number;
	densityThreshold: number;
	minProminence: number;
	minAltitudeMeters?: number;
	maxAltitudeMeters?: number;
	maxSlope?: number;
}

export interface VegetationFieldSamplers {
	density(position: Vec3): Density3;
	placement(position: Vec3): number;
	terrain?: (position: Vec3) => TerrainSample;
}

export interface VegetationCandidate {
	id: string;
	patchId: string;
	position: Vec3;
	localMeters: readonly [number, number];
	density: Density3;
	placement: number;
	prominence: number;
	vigor: number; // clamped [0,1]
}

export function generateVegetationCandidates(
	patch: VegetationPatch,
	config: VegetationCandidateConfig,
	samplers: VegetationFieldSamplers
): VegetationCandidate[];

export interface CoverageConfig {
	channel: VegetationChannel;
	densityStart: number;
	densityFull: number;
}

/** Continuous coverage only; never emits instances. */
export function evaluateVegetationCoverage(
	density: Density3,
	microVariation: number,
	config: CoverageConfig
): number;
```

### Candidate algorithm

Validate all patch/config numbers as finite. Dimensions and spacing must be
positive. Tangents must be unit length within `1e-5` and mutually orthogonal within
`1e-5`. Placement/density thresholds must be in `[0,1]`; prominence and slope must
be non-negative; altitude minimum may not exceed maximum. Invalid input throws
`RangeError`.

The patch owns a half-open grid of cell centers:

```text
x = (ix + 0.5) * spacingMeters, x < widthMeters
y = (iy + 0.5) * spacingMeters, y < heightMeters
position = origin + tangentX*x + tangentY*y
```

Iterate `iy` outer, `ix` inner. For each owned center:

1. sample placement at the center and at `±tangentX*spacing`,
   `±tangentY*spacing`; neighbor positions may fall outside this patch and are
   intentionally sampled so adjacent patch boundaries do not become ecological
   boundaries;
2. require the center to be **strictly greater** than all four neighbors;
3. `prominence = center - max(neighbors)`; require
   `prominence >= minProminence`;
4. require `center >= placementThreshold`;
5. sample density and require `density[channel] >= densityThreshold`;
6. when a terrain sampler exists, apply optional altitude bounds and `maxSlope`;
7. emit the candidate.

Candidate IDs are deterministic:
`"${patch.id}:${ix}:${iy}:${channel}"`. Output order is grid order.

`vigor` is:

```text
placementVigor = clamp((placement - placementThreshold) /
                       max(1e-9, 1 - placementThreshold), 0, 1)
vigor = clamp(placementVigor * density[channel], 0, 1)
```

No probability, random seed, or cross-patch suppression is part of M12.1.

### Coverage algorithm

Validate `0 <= densityStart < densityFull <= 1`. Compute a clamped smoothstep from
the selected density channel over that range and multiply by
`clamp(microVariation, 0, 1)`. This function is explicitly continuous coverage;
it does not call or share state with candidate generation.

### Gate

`vegetation.test.ts` must prove:

1. the same patch/config/samplers produce byte-for-byte identical candidates;
2. a synthetic field with two known peaks emits exactly those peaks in stable
   grid order;
3. a broad plateau emits no candidates because peak comparison is strict;
4. prominence, placement, ecology channel, altitude, and slope filters each reject
   a candidate independently;
5. neighbor sampling crosses patch bounds while only owned cell centers emit;
6. changing the patch's world origin changes sample coordinates but not metric
   spacing;
7. invalid patch/config geometry throws;
8. coverage returns 0 below the start, 1 at/above full with unit micro variation,
   and never emits candidates.

Run:

```sh
npm run check -w @virtual-planet/runtime-cpu
npm test -w @virtual-planet/runtime-cpu
npm run check --workspaces --if-present
npm test --workspaces --if-present
```

## M12.2 — GPU candidate compute (not yet implementation-ready)

After M12.1 lands, pin a separate brief for a `runtime-webgpu` compute consumer
that evaluates the same metric-space ecology/placement rules into a bounded storage
buffer. It must consume the standard module resolver, define overflow behavior, and
compare a small deterministic fixture with M12.1. No GPU work starts from this
paragraph alone.

## M12.3 — editor instance preview (not yet implementation-ready)

After M12.2 lands, pin a visual brief for an instanced peak preview in
`/graph-editor`, with altitude-based none/statistical/impostor/full modes. The
graph-editor remains scene-free. No renderer integration or planet adoption is
part of M12.

## Out of scope

No species asset loading, biome simulation, explicit ecosystem cells, randomness,
cross-patch suppression radius, workers, GPU buffers, editor controls, scene-tree
integration, planet renderer adoption, or changes to the patch scheduler.

## Done when

For M12.1: runtime-cpu and full workspace gates are green, candidate generation is
deterministic and metric-space, coverage is kept separate from instances, and no
vegetation-specific type enters Graph IR.

## Handoff

→ **M12.2 — GPU candidate compute contract** · architect pins buffer layout,
capacity/overflow semantics, graph field bindings, and CPU parity fixture before
implementation.
