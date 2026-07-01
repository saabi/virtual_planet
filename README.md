# World Lab

WebGPU-first world-authoring monorepo — **SvelteKit 2 + Svelte 5**. Its first app, **Virtual
Planet**, is a procedural planet renderer; **WebGPUToy** is a WebGPU graph-editor playground.

| Directory | Role |
|-----------|------|
| **`apps/scene-editor/`** | Virtual Planet — active scene/planet-renderer app (SvelteKit 2, Svelte 5 runes, TypeScript, WebGPU) |
| **`apps/webgputoy/`** | WebGPUToy — graph editor / WebGPU playground app |
| **`packages/*`** | Shared libraries (e.g. `@virtual-planet/schema`) |
| **`fe.old/`** | Archived Sapper / Svelte 3 reference (not a workspace) |

## Commands

Requires **Node.js ≥ 22** (see `apps/scene-editor/.nvmrc`). Install from repo root; run app
commands from the app directory, e.g. **`apps/scene-editor/`**:

```sh
cd apps/scene-editor
npm install
npm run dev
npm run build
npm run check
npm test
```

## Routes

- **`/scene`** — scene / solar-system editor (primary)
- **`/solar-systems`** — SunDog galaxy map
- **`/planet`**, **`/old`** — retired (redirect to `/scene`)

See **`AGENTS.md`** for architecture and agent workflow.

## History

Git history on `main` is the original Color Lab `test/planet-editor` branch. See `EXTRACTION.md`.
