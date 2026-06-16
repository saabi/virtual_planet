# virtual_planet

Legacy **Sapper / Svelte 3** app with a working **procedural planet editor** — full git history from Color Lab branch `test/planet-editor`.

The default pane is **PlanetDisplay** (sample planets, crater noise, GLSL shading). Use the workspace menu (top-left triangle) to switch to colorspace, spectrum, or glsl-sandbox.

## Stack

- Sapper, Svelte 3, Rollup, WebGL + glslify
- `@sveltejs/svelte-subdivide` — resizable pane layout
- `src/color-engine/` — early TypeScript color math (shared ancestry with Color Lab)

## Commands

```sh
npm install
npm run dev      # sapper dev — PlanetDisplay by default
npm run build
```

## Planet rendering

| Path | Role |
|------|------|
| `src/routes/index.svelte` | Wires `PlanetDisplay` as default panel |
| `src/components/PlanetDisplay.svelte` | Editor UI + WebGL viewport |
| `src/shaders/planet.frag` / `planet.vert` | Procedural planet GLSL |
| `src/planet-editor/sample-planets.js` | Preset planet parameters |
| `src/components/controls/` | Range / CheckBox widgets |

## Provenance

Split from [saabi/colorlab](https://github.com/saabi/colorlab) — see `EXTRACTION.md` for how this repo was bootstrapped.
