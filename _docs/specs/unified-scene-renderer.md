# Unified scene renderer — one engine for spheres + procedural bodies

**Status:** proposal · **Scope:** converge the two render paths (scene-3d spheres +
the planet backend) into **one engine** — one device, one pass (color + **shared
depth**), one camera — drawing each body at its LOD, depth-composited, floating-origin.
**Evolves** the CSS cross-fade into a GPU render-to-texture composite (kept, not
retired). **Related:**
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
- `WebGPUBackend.renderToTexture` (render-to-target) + `useOffscreen` plumbing.
- The instanced sphere pipeline (`SceneRenderer`) + the terrain / atmosphere passes.

## Architecture (one frame)

In the **scene camera** (system space), **floating origin** (render origin rebased to
the camera each frame):

1. **Draw list.** Per visible body: `selectLod(px)` → `dot | sphere | procedural`, with
   `proceduralBlend`; cull off-screen. Cap procedural bodies at a **budget**.
2. **Spheres → shared color + depth.** Instanced dot/sphere bodies.
3. **Procedural bodies — two modes by `proceduralBlend`:**
   - **Fading (0 < blend < 1): render-to-texture + composite.** Render the body to an
     offscreen color(+depth) texture (matched camera) and composite over the shared
     scene with `alpha = blend`; coverage comes from the texture (its depth, later its
     atmosphere) → **real alpha, no CSS mask**. Keeps `renderToTexture` first-class.
   - **Close (blend = 1): single-pass.** Render the terrain directly into the shared
     pass + **shared depth**, in the scene view-projection at the body's
     camera-relative offset (`bodyEcef − cameraEcef`) — per-pixel occlusion. The
     GPU-deep mode, only for the dominant body (and, later, co-dominant ones).
4. **Atmospheres + tone-map / present.** For single-pass bodies, scattering reads the
   shared depth; for fading bodies it's baked in the offscreen texture.

The common case (a fade) uses the **tractable, alpha-correct offscreen path**; the hard
shared-depth single-pass work is deferred to the close/dominant body.

Key unifications:
- **One** device + canvas + **depth** buffer (today: two devices, two depths).
- The terrain/atmosphere passes take an **external view-projection (scene camera) + a
  per-body world offset**, instead of owning their camera/localFrame. *The core change.*
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
2. **Offscreen-composite fade (alpha-correct)** — render the body to a texture and
   composite into the shared scene with `alpha = blend` + texture coverage. Replaces
   the CSS layer + radial mask with real alpha. Tractable, verify-loop friendly.
3. **Single-pass for the close body** — terrain into the shared pass + shared depth at
   the scene camera/offset, when `blend = 1`. **The keystone — GPU-deep.**
4. **Atmospheres in-pass; multi-body + budget; floating origin; surface camera** —
   the "gas giant from a moon's surface" payoff.

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
