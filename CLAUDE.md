# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Also read **`AGENTS.md`** — it holds the wave-integration workflow, stream-ownership rules, and gate checklist that govern how changes land. This file covers commands and architecture.

## Layout

**World Lab** — WebGPU-first world-authoring monorepo. Its Scene Editor includes a
procedural multi-scale planet renderer. An **npm-workspaces monorepo** (root
`package.json`, single root `package-lock.json`):

- **`apps/scene-editor/`** — the active Scene Editor app (SvelteKit 2 + Svelte 5 runes +
  TypeScript), deployed at `https://planets.ferreyrapons.com`. Most work happens here.
- **`apps/webgputoy/`** — the graph-editor / WebGPU playground app.
- **`packages/*`** — reusable, eventually-publishable libraries (e.g. `@world-lab/schema`).
  Each is its own workspace with `check`/`test` scripts.

Within `apps/scene-editor/`, routes:
- **`/scene/[...path]`** — the path-addressed scene/solar-system editor (URL = the scene-tree path); top-down map + body tree + schema-driven node editor. `/system` redirects here. See `_docs/specs/`.
- **`/solar-systems`** — SunDog galaxy map; opens systems into `/scene`.
- **`/planet`**, **`/old`** — retired (308 redirect to `/scene`).

## Commands

Requires **Node.js 22** (`apps/scene-editor/.nvmrc` pins `22.22.2`). All commands run from
**`apps/scene-editor/`**:

```sh
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
cd apps/scene-editor
npm install
npm run dev          # Vite dev server
npm run build        # production build → apps/scene-editor/build/
npm start            # run the built node-adapter server
npm run check        # svelte-check — run after any change
npm test             # vitest run (one-shot)
npx vitest run src/lib/planet/scene/collectLights.test.ts   # single test file
npx vitest run -t "includes fill when enabled"              # single test by name
```

There is no lint/format step; `npm run check` (svelte-check) is the type/correctness gate.

Monorepo: run `npm install` **from the root** (one lockfile links all workspaces). App
commands still run from `apps/scene-editor/`. Package commands run from the package dir, or
from root via `npm run check -w @world-lab/schema` / `npm test -w @world-lab/schema`.

## Architecture

Data flows one direction each frame:

**`PlanetScene` + camera + lighting → `SceneViewport3D` / `PlanetRenderer` → `RenderBackend` → GPU passes.**

`SceneViewport3D.svelte` (`lib/planet/components/`) owns the `/scene` render loop. Procedural bodies use `PlanetRenderer` + `WebGPUBackend` via `recordInto`. Math, scheduling, and scene document logic are pure TypeScript modules with no Svelte dependency.

### Key modules (`apps/scene-editor/src/lib/planet/`)

- **`params/`** — `PlanetParameters` shape, `presets.ts`, GPU buffer packing, `paramEditorSchema.ts` (Appearance editor).
- **`math/`** — geodetic, ECEF, `localFrame.ts`, `vec.ts`. Double precision on CPU.
- **`patches/`** — cube-sphere mapping, schedulers, culling, vertex-budget. `types.ts` is a shared contract.
- **`camera/`** — orbit, free-fly, spaceflight modes.
- **`scene/`** — scene graph, drivers, `collectLights.ts`, `sceneDocument.ts` (localStorage scene persistence).
- **`scene3d/`** — draw list, sphere/water/atmosphere passes, `sceneEngine.ts`.
- **`material/`** — `biomes.ts`: material overrides + debug modes.
- **`render/`** — `RenderBackend`, `WebGPUBackend`, `passes/` (terrain, atmosphere).
- **`gpu/wgsl/`** — primary WGSL shaders (`planet/`, `terrain/`, `atmosphere/`, `scene3d/`, …).
- **`gpu/glsl/`** — GLSL mirror for WebGL fallback (may lag WGSL).

### Shaders

- WGSL: `#include "relative/path.wgsl"` via **`apps/scene-editor/vite-wgsl.ts`**.
- GLSL: glslify via **`apps/scene-editor/vite-glslify.ts`**.
- `gpu/wgslCompile.test.ts` compiles against a real WebGPU device when available.

### Deferred work

Picking pass, heightfield pass, and walk camera are stubs on `RenderBackend` until rendering gates pass (see `AGENTS.md`).
