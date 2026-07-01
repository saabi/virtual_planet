# City Generation Plan for World Lab Scene Editor

Status: companion implementation spec  
Scope: procedural, terrain-aware, editor-assisted city generation for a shader-sampled planet  
Primary target: a 2D canvas/editor prototype that is architecturally compatible with the WebGPU cube-sphere renderer

---

## 1. Design premise

World Lab should not start with a generic city generator. It should start with a small, deterministic city system that composes cleanly with the existing planet model:

- planet terrain is sampled procedurally, not read from a persistent heightfield;
- terrain evaluation happens in body-local coordinates, eventually in WGSL through `sample_planet` or equivalent sampling functions;
- planet rendering is based on cube-sphere patches and screen-space density;
- editor actions should produce stable scene data, not opaque baked-only assets;
- city generation should be constraint-led, but the first constraint pass should be simple validation plus deterministic repair, not an external solver.

The foundational city object should therefore be a scene node containing a seed, a local tangent frame, a radius/extent, district masks, required facilities, terrain modifier parameters, and optionally cached/baked layout artifacts. The generator should be rerunnable from this data.

---

## 2. Phase 0: minimum useful city slice

Phase 0 should produce one city archetype:

**Starport settlement**

Required facilities:

- `starport_pad`
- `exchange`
- `warehouse`
- `bar`
- `ship_parts_shop`
- `fuel_depot`

Generated layers:

1. local terrain sample grid;
2. suitability map;
3. grading modifier field;
4. manual or radial district mask;
5. primary street loop or spine;
6. simple lot grid aligned to a local tangent frame;
7. greedy facility placement with validation;
8. saved scene node plus deterministic derived artifacts.

Non-goals for Phase 0:

- no 3D building meshes;
- no ML layout generation;
- no full tensor-field editor;
- no SDF terrain editing;
- no external ASP/CSP solver;
- no global traffic simulation;
- no automatic city-region economy.

This is enough to validate whether city placement, terrain grading, district constraints, and scene persistence fit the renderer architecture.

---

## 3. Core architectural problem

The hard question is:

> How do terrain modifiers for cities compose with a shader-evaluated planet that has no persistent heightfield?

There are three viable answers. Phase 0 should implement the first, while leaving hooks for the others.

### Option A: scene-attached modifier field evaluated by `sample_planet`

The city node contributes a compact list of terrain modifiers. Each modifier is evaluated at sample time in body-local coordinates.

This keeps terrain stateless and deterministic.

Conceptually:

```ts
type PlanetSampleInput = {
  bodyLocal: Vec3;
  normal: Vec3;
  planetId: string;
};

type PlanetSample = {
  height: number;
  albedoClass: number;
  roughness?: number;
  biome?: number;
};

function samplePlanetWithSceneModifiers(input: PlanetSampleInput, scene: Scene): PlanetSample {
  const base = samplePlanetBase(input);
  const modifiers = scene.spatialIndex.queryTerrainModifiers(input.bodyLocal);
  return applyTerrainModifiers(base, input, modifiers);
}
```

Equivalent WGSL shape:

```wgsl
struct TerrainModifier {
  kind: u32,
  body_center: vec3<f32>,
  tangent_x: vec3<f32>,
  tangent_y: vec3<f32>,
  radius_x: f32,
  radius_y: f32,
  target_height: f32,
  blend_width: f32,
  strength: f32,
  flags: u32,
};

fn apply_city_grading(
  base_height: f32,
  body_pos: vec3<f32>,
  modifier: TerrainModifier
) -> f32 {
  let rel = body_pos - modifier.body_center;
  let u = dot(rel, modifier.tangent_x) / modifier.radius_x;
  let v = dot(rel, modifier.tangent_y) / modifier.radius_y;
  let r = sqrt(u * u + v * v);

  if (r > 1.0 + modifier.blend_width) {
    return base_height;
  }

  let inner = 1.0;
  let outer = 1.0 + modifier.blend_width;
  let blend = 1.0 - smoothstep(inner, outer, r);
  return mix(base_height, modifier.target_height, blend * modifier.strength);
}
```

Recommended Phase 0 behavior:

- one elliptical city pad modifier;
- target height computed from median sampled base terrain inside the footprint;
- blend width expressed as a fraction of city radius;
- editor preview evaluates the same function on a 2D local grid;
- WebGPU path later uploads city modifiers in a storage/uniform buffer and evaluates nearby modifiers during terrain sampling.

Pros:

- deterministic;
- no persistent planet heightfield;
- compatible with shader terrain;
- works with cube-sphere patches because all queries use body-local coordinates.

Cons:

- shader needs access to nearby modifiers;
- too many modifiers per planet can become expensive;
- local caches may still be needed for editing speed.

### Option B: local baked override patch

The city node stores a small local height/paint texture in tangent-plane coordinates. `sample_planet` checks whether a body-local position lies inside a local override patch and blends against the texture.

Use this later for hand-edited or complex cities.

Pros:

- supports arbitrary grading and paint masks;
- easy editor visualization;
- can be compressed and streamed per city.

Cons:

- introduces persistent data;
- requires tangent-plane projection and seams management;
- less elegant than procedural modifiers.

### Option C: hybrid modifier plus baked derived artifact

The scene node stores procedural parameters as source of truth and also stores generated artifacts for speed:

- terrain sample grid;
- suitability map;
- district mask texture;
- road graph;
- lots;
- facility placements.

The source parameters remain authoritative. Caches are invalidated when relevant planet or city parameters change.

This should become the default after Phase 0.

---

## 4. Scene-node schema

A city should be a first-class scene node, not only a baked artifact.

```ts
type CityNode = {
  type: 'city';
  id: string;
  name: string;

  planetId: string;
  seed: number;
  archetype: 'starport_settlement';

  frame: CityFrame;
  extent: CityExtent;

  terrainPolicy: CityTerrainPolicy;
  districts: DistrictSpec[];
  requiredFacilities: FacilityRequirement[];
  generation: CityGenerationParams;

  derived?: CityDerivedArtifacts;
  dirty: CityDirtyFlags;
};

type CityFrame = {
  bodyCenter: [number, number, number];
  up: [number, number, number];
  tangentX: [number, number, number];
  tangentY: [number, number, number];
};

type CityExtent = {
  radiusX: number;
  radiusY: number;
  rotationRad: number;
};

type CityTerrainPolicy = {
  mode: 'modifier_field' | 'local_override_patch' | 'hybrid';
  grading: {
    enabled: boolean;
    targetHeightMode: 'median' | 'mean' | 'manual';
    manualTargetHeight?: number;
    blendWidth: number;
    maxCut: number;
    maxFill: number;
  };
  paint: {
    enabled: boolean;
    surfaceClass: 'urban_pad' | 'dusty_starport' | 'stone' | 'metal';
    blendWidth: number;
  };
};

type DistrictSpec = {
  id: string;
  kind: 'starport' | 'commercial' | 'industrial' | 'residential' | 'slum' | 'civic';
  mask: DistrictMaskSpec;
  roadPattern: 'grid' | 'spine' | 'loop' | 'organic';
  density: number;
};

type DistrictMaskSpec =
  | { mode: 'manual_polygon'; points: [number, number][] }
  | { mode: 'radial_band'; inner: number; outer: number; angleStart: number; angleEnd: number }
  | { mode: 'noise_threshold'; channel: 'density' | 'wealth' | 'industry'; min: number; max: number };

type FacilityRequirement = {
  kind:
    | 'starport_pad'
    | 'exchange'
    | 'warehouse'
    | 'bar'
    | 'ship_parts_shop'
    | 'fuel_depot';
  count: number;
  allowedDistricts: string[];
  minLotSize: [number, number];
  roadAccess: 'primary' | 'secondary' | 'any';
  adjacency?: FacilityAdjacencyRule[];
};

type FacilityAdjacencyRule = {
  otherKind: string;
  relation: 'near' | 'far' | 'not_adjacent' | 'same_district';
  distance?: number;
};

type CityGenerationParams = {
  version: number;
  road: {
    primaryPattern: 'spine_loop';
    secondaryPattern: 'lot_grid';
    primaryWidth: number;
    secondaryWidth: number;
    blockSize: number;
  };
  lots: {
    minSize: [number, number];
    maxSize: [number, number];
    setback: number;
  };
  validation: {
    maxMeanSlope: number;
    maxSlopeAtFacility: number;
    requireConnectedRoadGraph: boolean;
  };
};

type CityDerivedArtifacts = {
  terrainSampleGrid?: TerrainSampleGrid;
  suitabilityGrid?: SuitabilityGrid;
  terrainModifiers?: TerrainModifierSpec[];
  roadGraph?: RoadGraph;
  lots?: Lot[];
  facilities?: FacilityPlacement[];
  districtRaster?: DistrictRaster;
};

type CityDirtyFlags = {
  terrain: boolean;
  districts: boolean;
  roads: boolean;
  lots: boolean;
  facilities: boolean;
};
```

Persistence rule:

- save the city node parameters always;
- save derived artifacts only if they are expensive or manually edited;
- regenerate deterministic artifacts from `seed + planet parameters + city parameters`;
- mark derived terrain artifacts dirty if `PlanetParameters` affecting `sample_planet` change.

---

## 5. Coordinate contract

City generation should run in a local tangent plane, but every sample and saved anchor must be tied back to body-local coordinates.

Required transforms:

```ts
function cityUvToBody(frame: CityFrame, u: number, v: number): Vec3;
function bodyToCityUv(frame: CityFrame, body: Vec3): Vec2;
function cityUvToPlanetSampleInput(city: CityNode, u: number, v: number): PlanetSampleInput;
```

Important rule:

- local `u/v` is for generation convenience;
- body-local position is the authoritative spatial coordinate;
- road vertices and lot corners may be stored in `u/v`, but must be reproducible against the saved `CityFrame`.

---

## 6. Generation pipeline

### Step 1: sample terrain

Input:

- city frame;
- city extent;
- sample resolution;
- planet parameters.

Output:

- height grid;
- slope grid;
- curvature or roughness grid;
- optional biome/texture class grid.

```ts
function sampleCityTerrain(city: CityNode, planet: PlanetParameters): TerrainSampleGrid {
  // For each local grid cell:
  // 1. convert city uv to body-local position;
  // 2. call stateless planet sampler;
  // 3. estimate slope from neighbor height samples;
  // 4. store height, slope, biome, roughness.
}
```

### Step 2: compute suitability

Suitability is not a zone. It answers: “how expensive is it to build here?”

Suggested channels:

- `flatness`: lower slope is better;
- `cutFillCost`: lower delta to target grade is better;
- `accessibility`: closer to primary road/spine is better;
- `hazard`: cliffs, water, lava, or biome exclusions;
- `districtBias`: author/editor preference.

```ts
type SuitabilityCell = {
  build: number;
  road: number;
  starport: number;
  industrial: number;
  commercial: number;
  residential: number;
};
```

### Step 3: create grading modifier

For Phase 0, compute one city pad:

- median height within footprint;
- elliptical falloff;
- clamp by max cut/fill;
- preview cut/fill heatmap in the editor.

The terrain modifier is saved as source data and may also be uploaded to the renderer.

### Step 4: district mask

Phase 0 should allow manual district masks and a default starport layout.

Default layout:

- starport pad near one edge of the city ellipse;
- industrial district adjacent to starport;
- commercial district around exchange/bar spine;
- residential/slum beyond the main commercial strip.

District masks are stored as polygons or radial bands in local city coordinates.

### Step 5: primary road graph

For Phase 0:

- one main spine from city entrance to starport;
- one loop road around the core;
- optional branch to industrial/warehouse area.

This is better than a full tensor field because it is debuggable and enough for gameplay.

```ts
type RoadGraph = {
  nodes: RoadNode[];
  edges: RoadEdge[];
};

type RoadNode = {
  id: string;
  uv: [number, number];
  kind: 'gate' | 'junction' | 'facility_access' | 'dead_end';
};

type RoadEdge = {
  id: string;
  a: string;
  b: string;
  class: 'primary' | 'secondary' | 'service';
  width: number;
};
```

Road generation rule:

- primary roads may cross district boundaries;
- secondary roads are generated inside districts;
- service roads connect required facilities;
- roads are validated against slope and cut/fill cost.

### Step 6: block and lot subdivision

For Phase 0, avoid polygon-heavy algorithms at first.

Use a simple block grid clipped by district masks:

- create cells aligned to city frame;
- remove cells intersecting roads;
- classify remaining cells by district;
- merge cells when required facility lots need larger rectangles;
- export lots as rectangles/polygons.

```ts
type Lot = {
  id: string;
  districtId: string;
  polygon: [number, number][];
  centroid: [number, number];
  area: number;
  roadAccess: 'primary' | 'secondary' | 'service' | 'none';
  tags: string[];
};
```

### Step 7: facility placement

Do not introduce ASP/CSP in Phase 0.

Use greedy placement plus validation:

1. sort required facilities by strictness;
2. score candidate lots;
3. place the highest-scoring candidate;
4. reserve/merge its lot;
5. validate adjacency and road access;
6. repair if necessary by swapping candidates;
7. fail loudly with editor diagnostics if no solution exists.

```ts
type PlacementScore = {
  lotId: string;
  facilityKind: string;
  score: number;
  reasons: string[];
};

function placeFacilitiesGreedy(
  lots: Lot[],
  requirements: FacilityRequirement[],
  roadGraph: RoadGraph,
  suitability: SuitabilityGrid,
  seed: number
): FacilityPlacement[];
```

When to upgrade to CSP:

- multiple required facilities frequently fail greedy repair;
- faction/economy rules require global consistency;
- the editor needs “explain why no valid city exists” diagnostics;
- constraints become reusable authoring content.

Before that, use a tiny internal constraint language and a validator.

---

## 7. Constraint language v0

The constraint layer should start as JSON-like data, not as a solver-specific DSL.

```ts
type CityConstraint =
  | {
      type: 'require_facility';
      kind: FacilityKind;
      count: number;
      allowedDistrictKinds: DistrictKind[];
    }
  | {
      type: 'facility_near_facility';
      a: FacilityKind;
      b: FacilityKind;
      maxDistance: number;
    }
  | {
      type: 'facility_far_from_facility';
      a: FacilityKind;
      b: FacilityKind;
      minDistance: number;
    }
  | {
      type: 'facility_road_access';
      kind: FacilityKind;
      roadClass: 'primary' | 'secondary' | 'service';
    }
  | {
      type: 'district_min_area';
      districtKind: DistrictKind;
      minArea: number;
    }
  | {
      type: 'max_slope_for_facility';
      kind: FacilityKind;
      maxSlope: number;
    };
```

Example for a SunDog-like starport:

```json
[
  { "type": "require_facility", "kind": "starport_pad", "count": 1, "allowedDistrictKinds": ["starport"] },
  { "type": "require_facility", "kind": "exchange", "count": 1, "allowedDistrictKinds": ["commercial"] },
  { "type": "require_facility", "kind": "warehouse", "count": 1, "allowedDistrictKinds": ["industrial"] },
  { "type": "require_facility", "kind": "bar", "count": 1, "allowedDistrictKinds": ["commercial", "slum"] },
  { "type": "require_facility", "kind": "ship_parts_shop", "count": 1, "allowedDistrictKinds": ["commercial", "industrial"] },
  { "type": "facility_near_facility", "a": "warehouse", "b": "starport_pad", "maxDistance": 300 },
  { "type": "facility_road_access", "kind": "warehouse", "roadClass": "primary" },
  { "type": "facility_far_from_facility", "a": "fuel_depot", "b": "bar", "minDistance": 150 }
]
```

The same constraints can later be translated to a CSP/ASP backend if necessary.

---

## 8. Editor workflow

### Placement preview

When the user hovers over the planet:

1. derive candidate `CityFrame` from body-local hit point;
2. sample a low-resolution local terrain grid;
3. compute suitability score;
4. show footprint ellipse and cut/fill heatmap;
5. show validation warnings.

### Commit city node

On click/confirm:

1. create `CityNode` with seed and frame;
2. generate derived artifacts;
3. attach terrain modifier to scene;
4. save node through the normal scene document path.

### Edit city

Editable controls:

- move/rotate/scale footprint;
- target grade height;
- district masks;
- road spine handles;
- regenerate roads/lots/facilities;
- lock specific facilities/lots.

Locked artifacts should survive regeneration.

---

## 9. Renderer integration

### CPU/editor path

The editor uses the TypeScript sampler equivalent of the planet shader function.

Required rule:

- the editor sampling function and WGSL terrain sampling must share coefficients, seeds, and modifier semantics.

Recommended approach:

- keep terrain formula parameters in serializable structs;
- generate or mirror WGSL constants from shared definitions where practical;
- write test fixtures comparing CPU sample and shader sample tolerances.

### GPU/render path

The render path needs a spatially filtered modifier list.

Phase 0 can use a small fixed array:

```wgsl
const MAX_TERRAIN_MODIFIERS: u32 = 16u;
```

Later:

- per-planet modifier buffer;
- per-patch culling of relevant modifiers;
- storage buffer for local override patches;
- texture atlas for baked city masks.

Patch contract:

- cube-sphere patch vertex generation calls `sample_planet`;
- `sample_planet` applies relevant terrain modifiers;
- city roads/lots/facility overlays are separate scene layers and may render as decals or line geometry.

---

## 10. Module sketch

Suggested modules. Paths can be adjusted to the existing repo structure.

```txt
src/lib/city/
  city-types.ts
  city-frame.ts
  city-terrain-sampling.ts
  city-suitability.ts
  city-districts.ts
  city-roads.ts
  city-lots.ts
  city-facilities.ts
  city-constraints.ts
  city-generator.ts
  city-serialization.ts

src/lib/terrain/
  terrain-modifiers.ts
  terrain-modifier-eval.ts

src/lib/rendering/wgsl/
  terrain_modifiers.wgsl
  city_overlays.wgsl

src/routes/editor/
  CityPlacementTool.svelte
  CityInspector.svelte
```

Core orchestration:

```ts
function generateCity(node: CityNode, planet: PlanetParameters): CityNode {
  const terrain = sampleCityTerrain(node, planet);
  const suitability = computeSuitability(node, terrain);
  const terrainModifiers = buildCityTerrainModifiers(node, terrain, suitability);
  const districts = resolveDistrictMasks(node, suitability);
  const roadGraph = generateRoadGraph(node, districts, suitability);
  const lots = subdivideLots(node, districts, roadGraph, suitability);
  const facilities = placeFacilitiesGreedy(lots, node.requiredFacilities, roadGraph, suitability, node.seed);
  const validation = validateCity(node, terrain, roadGraph, lots, facilities);

  return {
    ...node,
    derived: {
      terrainSampleGrid: terrain,
      suitabilityGrid: suitability,
      terrainModifiers,
      roadGraph,
      lots,
      facilities,
      districtRaster: rasterizeDistricts(districts),
    },
    dirty: validationToDirtyFlags(validation),
  };
}
```

---

## 11. Wave gates

### Wave 0: 2D deterministic city canvas

Goal:

- standalone or in-editor 2D view that exercises the real data model.

Must pass:

- seed produces stable terrain, districts, roads, lots, and facilities;
- city node serializes/deserializes without losing determinism;
- required starport facilities are placed or a clear validation error is shown;
- terrain modifier preview uses the same falloff contract planned for WGSL.

### Wave 1: scene-node integration

Goal:

- city exists as a scene node attached to a planet.

Must pass:

- document load/save round trip;
- city frame persists in body-local coordinates;
- changing seed regenerates derived artifacts;
- moving city invalidates terrain/district/road/lots/facilities in correct order.

### Wave 2: terrain modifier integration

Goal:

- city grading composes with procedural planet sampling.

Must pass:

- CPU `samplePlanetWithSceneModifiers` works;
- WGSL modifier function matches CPU preview within tolerance;
- cube-sphere patches show flattened city pad;
- modifier blending does not create visible discontinuities at footprint edge.

### Wave 3: roads/lots/facilities on planet

Goal:

- city layout appears on the planet surface.

Must pass:

- roads render as tangent-plane decals or projected strips;
- lots/facilities render as editor overlays;
- picking/selecting a facility resolves back to its scene node artifact;
- facility locks survive regeneration.

### Wave 4: richer districts and constraints

Goal:

- expand beyond one starport archetype.

Must pass:

- multiple archetypes share the same generator pipeline;
- constraint validator explains failures;
- greedy repair succeeds on common cases;
- only then consider a CSP/ASP backend.

---

## 12. Further reading

Use these as background references, not as Phase 0 implementation requirements.

- Yoav I. H. Parish and Pascal Müller, **Procedural Modeling of Cities**, SIGGRAPH 2001.  
  https://web.archive.org/web/20060114082225/http://www.vision.ee.ethz.ch/~pmueller/documents/procedural_modeling_of_cities__siggraph2001.pdf

- George Kelly and Hugh McCabe, **Citygen: An Interactive System for Procedural City Generation**, Fifth International Conference on Game Design and Technology, 2007.  
  https://www.citygen.net/files/citygen_gdtw07.pdf

- Pascal Müller, Peter Wonka, Simon Haegler, Andreas Ulmer, Luc Van Gool, **Procedural Modeling of Buildings**, SIGGRAPH 2006.  
  https://web.archive.org/web/20070316020051/http://www.vision.ee.ethz.ch/~pmueller/documents/mueller.procedural_modeling_of_buildings.SG2006.web-version.pdf

- Guoning Chen, Gregory Esch, Peter Wonka, Pascal Müller, Eugene Zhang, **Interactive Procedural Street Modeling**, SIGGRAPH 2008.  
  https://www.cs.purdue.edu/homes/cmh/spring10/ProceduralStreetModeling.pdf

- Amit Patel, **Making Maps with Noise Functions**, Red Blob Games, 2015–2022.  
  https://www.redblobgames.com/maps/terrain-from-noise/

- Amit Patel, **Procedural Map Generation on a Sphere**, Red Blob Games, 2018.  
  https://www.redblobgames.com/x/1843-planet-generation/

- Luiz Fernando Silva Eugênio dos Santos, Claus Aranha, André Ponce de Leon F. de Carvalho, **An Agent-Based Approach to Procedural City Generation Incorporating Land Use and Transport Interaction Models**, 2022.  
  https://arxiv.org/abs/2211.01959

---

## 13. Immediate implementation target

The next prototype should not be a visual toy. It should be a small executable model of this architecture.

Minimum files:

```txt
city-types.ts
city-frame.ts
city-terrain-sampling.ts
city-suitability.ts
city-districts.ts
city-roads.ts
city-lots.ts
city-facilities.ts
city-generator.ts
city-debug-canvas.ts
```

Minimum demo controls:

- seed;
- footprint radius;
- grade blend width;
- target grade mode;
- district mask mode;
- regenerate;
- export/import JSON.

Minimum debug layers:

- terrain height;
- slope;
- suitability;
- grading cut/fill;
- district mask;
- roads;
- lots;
- facility placements;
- validation errors.

The output JSON should already look like the eventual `CityNode` scene document.
