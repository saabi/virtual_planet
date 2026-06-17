# virtual_planet

Procedural planet renderer — migrating from legacy Sapper to **SvelteKit 2 + Svelte 5**.

| Directory | Role |
|-----------|------|
| **`fe/`** | Active app (SvelteKit 2, Svelte 5 runes, TypeScript) |
| **`fe.old/`** | Archived Sapper / Svelte 3 planet editor (reference for porting) |

## Commands

Requires **Node.js ≥ 22.12** (see `fe/.nvmrc`). Run from **`fe/`**:

```sh
cd fe
npm install
npm run dev
npm run build
npm run check
```

Legacy Sapper app (reference only):

```sh
cd fe.old
npm install
npm run dev
```

## History

Git history on `main` is the original Color Lab `test/planet-editor` branch (42 commits). See `EXTRACTION.md`.
