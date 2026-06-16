# Extraction record

Created: 2026-06-16

## This repository

Standalone repo at `~/repos/virtual_planet` with **42 commits** of history from Color Lab `test/planet-editor`, branch renamed to **`main`**. No other Color Lab branches are present.

## Bootstrap (from colorlab)

```sh
cd ~/repos/virtual_planet
git init
git remote add source /home/ushif/repos/colorlab
git fetch source refs/remotes/gitlab/test/planet-editor:main
git checkout main
git remote remove source
```

## Source branch

| Field | Value |
|-------|--------|
| Upstream repo | `colorlab` |
| Branch | `gitlab/test/planet-editor` |
| Tip | `89a9ffa` — *Now starts with a single pane* |
| Planet feature commits | `0f00a80` (basic editor), `2b5c336` (samples + selector), `d387938` (craters) |
| First commit | `dbd5a3c` — *First commit.* |

## Why planet-editor (not `fe.old/`)

`fe.old/` @ `1d1ccdde^` continued the gamut explorer on newer deps but **dropped** planet-editor work and never wired `PlanetDisplay` in `index.svelte`. This repo keeps the last working integration.

## Next steps

1. `npm install && npm run dev`
2. Add remote and push when ready
3. Plan port target (Sapper restore vs modern stack vs shader-only extract)
