# Body data vs viewport state — what belongs on a celestial node

**Status:** proposal · **Scope:** separate **intrinsic body design** from **camera,
renderer, and session** concerns; unify `/planet` documents with `/scene` body nodes.
**Driver:** the legacy `PlanetSnapshot` bundles camera settings (e.g. `lookAtHorizon`)
with terrain params; the solar-system renderer already stores appearance on
`BodyNode` while camera state is ephemeral in `SceneViewport3D`. **Related:**
[celestial-body-params.md](celestial-body-params.md),
[solar-system-model.md](solar-system-model.md),
[scene-routing.md](scene-routing.md),
[scene-procedural-rendering.md](scene-procedural-rendering.md),
[../fe/src/lib/planet/documents/README.md](../../fe/src/lib/planet/documents/README.md).

## Problem

Two parallel persistence models disagree about what a "planet" is:

| Concern | `/planet` (`PlanetSnapshot`) | `/scene` (`PlanetScene`) |
|---------|------------------------------|---------------------------|
| Terrain / materials | `params` + `presetName` | `BodyNode.appearance` |
| Atmosphere | `atmosphere` block | **Not on body yet** — defaults in procedural layers |
| Physical size | `params.radius` (render-space) | `radiusMeters` (SI) |
| Spin / axial tilt | Ephemeral UI (`spinAngle`, `axialTilt`) | `spinPeriodSeconds` on orbit chain |
| Camera | **`camera` saved in documents** | Ephemeral in `SceneViewport3D` |
| Tessellation / shading | Ephemeral (partial device persist) | Hardcoded defaults in procedural path |
| System lights | Local `createDefaultPlanetScene()` | Toy system graph (Sol, starlight, …) |

Opening a saved planet document restores **where you were looking** (`lookAtHorizon`,
azimuth, altitude) as if those were properties of Ferro or Cerule. They are not — they
are **viewport state**. The same mistake would propagate if we copied `PlanetSnapshot`
onto scene body nodes without splitting first.

[`AppearanceEditor.svelte`](../../fe/src/lib/planet/components/AppearanceEditor.svelte)
already states the intended boundary for `/scene`:

> Appearance = the planet shape/materials params (not atmosphere/camera/tessellation).

This spec makes that boundary authoritative across routes, persistence, and the editor.

## Decision

**A celestial body node carries only what the body *is*.** Camera pose, look mode,
flight modes, tessellation, debug shading, and document-selection metadata live
elsewhere.

```mermaid
flowchart TB
  subgraph persist_scene [Persist: scene document]
    bodies["BodyNode: appearance, atmosphere, spin, lod, radiusMeters"]
    graph["Orbits, drivers, lights, groups"]
  end

  subgraph persist_session [Persist: session only]
    viewport["ViewportState: camera, lookMode, fly modes"]
    selection["activeDocumentId, URL selection"]
  end

  subgraph persist_prefs [Persist: user or device prefs]
    tess["TessellationSettings"]
    shade["MaterialOverrides, debug toggles"]
  end

  subgraph ephemeral [Ephemeral per frame]
    clock["System clock t"]
    lod_runtime["LOD hysteresis state"]
  end

  persist_scene --> renderer["Solar system + focused-body renderer"]
  persist_session --> renderer
  persist_prefs --> renderer
  ephemeral --> renderer
```

## What belongs on a body node

Intrinsic to the celestial body; saved in the **scene document** (`vp.systemScene`) or
a per-body export; travels when the body is duplicated or shared.

| Field | Status today | Notes |
|-------|--------------|-------|
| `bodyType`, `radiusMeters`, `standIn` | On `BodyNode` | Physical identity |
| `appearance` (preset + overrides) | On `BodyNode` | See [celestial-body-params.md](celestial-body-params.md) |
| `lod` thresholds | On `BodyNode` | Screen-size render policy |
| **`atmosphere`** | **Missing on node** | Today only in `PlanetSnapshot`; procedural layers call `defaultAtmosphereParams` |
| **Spin + axial tilt** | **Split** | Toy system: `spinPeriodSeconds` on nodes; `/planet` UI: `spinAngle` / `axialTilt` not saved |
| `massKg`, rings, emissive | Future | [solar-system-model.md](solar-system-model.md) |

Target body payload (conceptual — not all fields exist yet):

```ts
interface CelestialBodyData {
  appearance: BodyAppearance;
  atmosphere?: AtmosphereParameters;
  // spin: spinPeriodSeconds + axial tilt on transform / rotation spec
  lod?: BodyLod;
}
```

**Two radii stay separate:** `radiusMeters` (SI, orbits, spheres) vs
`PlanetParameters.radius` (render-space noise relations). The resolver does not merge
them — see [celestial-body-params.md](celestial-body-params.md).

## What must NOT be on a body / planet document

### Camera and viewport

Currently in [`PlanetCameraState`](../../fe/src/lib/planet/documents/types.ts) and
written by [`toSnapshot`](../../fe/src/lib/planet/documents/snapshot.ts):

| Field | Why it is viewport state |
|-------|--------------------------|
| `azimuth`, `elevation` | Where the camera orbits |
| `altitudeMeters` / `distance` | Zoom / altitude |
| `lookAtHorizon` | Camera look mode (`horizon` vs `planet-center`) — **not a body property** |
| `orbitSpeedRadPerSec` | Camera auto-orbit animation |

Same category — ephemeral in [`PlanetViewport.svelte`](../../fe/src/lib/planet/components/PlanetViewport.svelte), correctly **not** in snapshot today, but grouped under "Camera" in the editor:

- `cameraRotation`, free-fly position/rotation
- Spaceflight modes, HUD, orbit predictor settings
- `SceneViewport3D` orbit camera (`azimuth`, `elevation`, `distance`) — already not persisted

**Target type:** `ViewportState` (or `CameraBookmark`) keyed by `(route, focusedBodyId,
viewMode)`. Restore from **session** only (`virtual-planet:session:v1` or a dedicated
`viewport:v1` key). Named planet saves must not include camera fields.

### Renderer quality and debug

Never body data:

| Field | Target home |
|-------|-------------|
| `TessellationSettings` | Device / user prefs ([device-tessellation-defaults.md](device-tessellation-defaults.md)) |
| `MaterialOverrides` (exposure, shadow fill, …) | View prefs or session |
| Wireframe, patch borders, face colors, material debug | Session / debug prefs |

### Editor and registry metadata

| Field | Target home |
|-------|-------------|
| `presetName` at snapshot root | Redundant with `appearance.preset`; document registry label only |
| `activeDocumentId` | Session envelope (already separate) |

### Misplaced inside `PlanetParameters`

| Field | Issue | Target |
|-------|-------|--------|
| `illumination` | Toggles scene light collection — render mode, not terrain shape | View pref or scene-level lighting flag |

## Rotation: editor vs model mismatch

[`PlanetEditorPanel`](../../fe/src/lib/planet/components/PlanetEditorPanel.svelte) groups
**Orbit** and **Rotation** under "Camera":

- **Orbit** controls → viewport (camera)
- **Rotation** (`axialTilt`, `spinAngle`, `spinSpeedRadPerSec`) → **body** — drives
  `planetRotation` in the renderer

Spin is animated in `/planet` but **not written to `PlanetSnapshot`**. The toy system
models spin as `spinPeriodSeconds` on body nodes evaluated by `evaluateScene`. These
paths must converge: body carries spin/tilt; camera does not.

## Current renderer wiring gaps

The solar-system path ([`SceneViewport3D`](../../fe/src/lib/planet/components/SceneViewport3D.svelte)
→ [`ProceduralBodyLayer`](../../fe/src/lib/planet/components/ProceduralBodyLayer.svelte)):

- Reads **`resolveBodyParams(body)`** for terrain — correct.
- Uses **`defaultAtmosphereParams(params.radius)`** — should use **`body.atmosphere`**.
- Uses **`DEFAULT_TESSELLATION`**, **`DEFAULT_MATERIAL_OVERRIDES`** — view/device prefs.
- Camera from host scene — correct (ephemeral); **`lookAtHorizon` not shared** —
  procedural layer hardcodes `lookMode: 'planet-center'`.
- Lighting from **`collectSceneLights`** — correct direction; focused body should use
  **`collectLightsForBody(scene, bodyId)`** when scoping matters.

Legacy `/planet` path still owns a monolithic snapshot and a local `createDefaultPlanetScene()` for lights instead of the system graph.

## Migration from `PlanetSnapshot`

Today’s [`PlanetSnapshot`](../../fe/src/lib/planet/documents/types.ts):

```ts
interface PlanetSnapshot {
  presetName: PlanetPresetName;
  params: PlanetParameters;
  atmosphere: AtmosphereParameters;
  camera: PlanetCameraState;  // ← remove from named saves
}
```

**Target:**

1. **Body fields** → scene node: `appearance`, `atmosphere`, spin/tilt on node.
2. **Camera fields** → session `ViewportState` only.
3. **Single-planet documents** → one-body scene (synthetic star or manual sun) per
   [solar-system-model.md](solar-system-model.md) persistence section.
4. **`/planet`** becomes a **focused-body view** of a scene path; shared `lib/` gains
   body fields; snapshot format deprecates after migration + version bump in
   [`migrate.ts`](../../fe/src/lib/planet/documents/migrate.ts).

Load path stays strict: `raw JSON → migrate → coerce` — never merge unknown keys into
live state ([documents README](../../fe/src/lib/planet/documents/README.md)).

## Implementation plan

### Phase A — Types and save behaviour (low risk)

1. Introduce `ViewportState` in `documents/types.ts` (or `scene/viewportState.ts`).
2. **`toSnapshot` for named documents:** pick body fields only; omit `camera`.
3. **Session restore:** keep camera in `PlanetSessionEnvelope` or split to
   `viewport` sub-object.
4. UI: document Save does not claim to persist camera (tooltip or section label).

### Phase B — Body node completeness

5. Add `atmosphere?: AtmosphereParameters` to `BodyNode`; bump `SCENE_DOC_VERSION`.
6. Atmosphere editor on `/scene` for planet/moon bodies (today: `/planet` panel only).
7. Wire `ProceduralBodyLayer`, `FocusedBodyView` to body atmosphere + evaluated spin
   from scene (not identity quaternion).

### Phase C — Document → scene migration

8. `migratePlanetDocToScene(snapshot)` → minimal `PlanetScene` with one body node.
9. Document registry optionally stores scene subgraph or `{ systemId, bodyPath }`.
10. Bump `CURRENT_SNAPSHOT_VERSION`; migration copies params/atmosphere to appearance;
    drops camera from stored documents (camera stays in session if present).

### Phase D — Editor reorganization

11. **Camera** super-section: viewport only; **Rotation** → body section on `/scene`.
12. **Shading / Tessellation / Debug** → "View" or "Renderer" (not saved with body).
13. Move `illumination` out of `PlanetParameters` into view/scene lighting toggle.

### Phase E — Renderer integration

14. Focused procedural render: `collectLightsForBody(scene, bodyId)`.
15. Viewport restore keyed by URL path (`/scene/.../ferro`).
16. Align look modes between scene camera, procedural layer, and future surface flight.

## Quick wins vs large lifts

| Effort | Change |
|--------|--------|
| **Quick** | Stop persisting `lookAtHorizon`, azimuth, elevation, altitude, orbit speed in **named document** saves |
| **Quick** | Label editor sections as "Body" vs "View" vs "Session" |
| **Medium** | `BodyNode.atmosphere` + procedural wiring |
| **Large** | Scene document as single source of truth; `/planet` as focused view ([unified-scene-renderer.md](unified-scene-renderer.md)) |

## Acceptance criteria

- Saving "Ferro" and reloading on another machine restores **terrain and atmosphere**,
  not camera pose or look-at-horizon.
- Two viewports on the same body (map + 3D, or split) can hold **different**
  `ViewportState` without conflicting body data.
- `AppearanceEditor` comment remains true: atmosphere is edited on the body, not mixed
  into camera controls.
- Toy system bodies round-trip through `serializeScene` with appearance + atmosphere +
  spin; no camera fields in scene JSON.

## Related

- [celestial-body-params.md](celestial-body-params.md) — `BodyAppearance` + resolver
- [solar-system-model.md](solar-system-model.md) — system persistence replaces single-planet doc
- [scene-routing.md](scene-routing.md) — URL mirrors scene tree; viewport keyed by path
- [device-tessellation-defaults.md](device-tessellation-defaults.md) — tessellation as device pref
