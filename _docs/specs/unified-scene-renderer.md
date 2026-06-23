# Unified scene renderer — one engine for spheres + procedural bodies

**Status:** background/spec history. The terrain part of this proposal has landed as a
single shared WebGPU pass on `/scene`; the CSS overlay and render-to-texture composite
paths were removed. Remaining implementation work is depth-aware procedural atmosphere,
multi-body procedural budgets, and surface/focused camera continuity. **Related:**
[scene-procedural-rendering.md](scene-procedural-rendering.md),
[scene-3d-viewport.md](scene-3d-viewport.md),
[celestial-body-params.md](celestial-body-params.md).

## Why

Two engines + a CSS-layer composite can't do per-pixel occlusion (a near moon over a
far gas giant), real atmosphere coverage, or a continuous camera. One engine does —
and it's the project's whole premise. This retires the radial-mask / camera-match
hacks the interim needed.

## What carries over (already built)

- `buildRenderFrame` (headless frame assembly), `PlanetRenderer`.
- `resolveBodyParams`, `selectLod`, `proceduralBlend` — the LOD model.
- Scene graph + `evaluateScene` + `getWorldTransform` + `collectSceneLights`.
- `PlanetRenderer.recordInto` / `WebGPUBackend.recordTerrainInto` for recording selected
  procedural terrain into an external scene pass.
- The instanced sphere pipeline (`SceneEngine`) + the terrain pass. The atmosphere pass
  exists for `/planet` but is not yet recorded into the shared scene pass.

## Architecture (one frame)

In the **scene camera** (system space), **floating origin** (render origin rebased to
the camera each frame):

1. **Draw list.** Per visible body: `selectLod(px)` → `dot | sphere | procedural`, with
   `proceduralBlend`; cull off-screen. Cap procedural bodies at a **budget**.
2. **Spheres → shared color + depth.** Instanced dot/sphere bodies.
3. **Procedural body — current implementation:** the selected body's terrain records
   directly into the shared color/depth pass in a body-relative scene view. The matching
   sphere is skipped while procedural terrain is active, so terrain depth-tests against
   the rest of the scene. Smooth in-pass opacity fade is deferred.
4. **Atmospheres + tone-map / present.** Pending for `/scene`: scattering must read the
   shared scene depth and composite in draw order without returning to a second canvas.

Key unifications:
- **One** device + canvas + **depth** buffer (today: two devices, two depths).
- The terrain pass takes an **external view-projection (scene camera) + a per-body world
  offset**, instead of owning a separate canvas/camera. Atmosphere still needs the same
  scene-pass adaptation.
- **Floating origin** shared by spheres + procedural so depth is comparable; reuse
  `buildLocalFrame` / `maybeRebaseFrame`.

## The hard seam (honest)

The terrain pipeline is built around the backend's own `CameraState` + `localFrame`
(its own projection). Re-pointing it at the **scene** camera + a per-body offset,
writing **shared** depth, is the core refactor — deeply GPU-coupled (WGSL uniforms,
bind groups, depth state). It's exactly where a blind change yields a black frame, so
it needs on-device verification at each step (see "Working method").

## Migration (each step user-verifiable)

1. **✅ Frame skeleton** — `scene3d/drawList.ts` (`buildDrawList`, pure+tested) is the
   one source the engine renders from; `scene3d/sceneEngine.ts` (`SceneEngine`) owns the
   device + shared depth + the render pass; `scene3d/spherePass.ts` (`SpherePass`)
   records the sphere draw into it. `SceneViewport3D` uses engine + sphere pass. No
   behaviour change — the seam where the fade composite + single-pass terrain plug in.
2. **✅ Single-pass terrain for the selected body** — `bodyRelativeView` plus shared
   device/pass/depth now records terrain into `SceneEngine` with
   `PlanetRenderer.recordInto()` / `WebGPUBackend.recordTerrainInto()`.
3. **Deferred opacity cross-fade** — the current code switches from sphere to terrain
   when procedural rendering activates. A later `objectOpacity` path can render both
   during the transition without reviving the CSS layer.
4. **Atmospheres in-pass; multi-body + budget; surface camera** — remaining renderer
   convergence work.

## Decisions

1. **Engine home:** a new `scene3d` engine hosting the passes (recommended — it owns
   the system camera/frame) vs extending `WebGPUBackend` to multi-body + spheres.
2. **Pass adaptation:** parameterize the *existing* terrain/atmosphere passes to accept
   an external camera + per-body offset (recommended, reuse) vs scene-specific forks.
3. **Budget:** how many bodies may be procedural at once (start: 1–2).

## Working method (given no GPU in CI)

The **testable / safe** parts I can build + verify headlessly: the engine structure,
the LOD draw-list, the camera + floating-origin math (pure), the per-body offset.
The **GPU-pass core** (steps 2–3 — terrain/atmosphere on the scene camera + shared
depth) needs on-device eyes; that's the part to pair on or have you drive with my
scaffolding, since a blind edit there is a black frame I can't debug.

Start with **(1) the frame skeleton** — pure structure, no behaviour change — then the
keystone (2) with tight verify loops.
