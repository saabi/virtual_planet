# Brief OS1 - World Lab identity and app layout

**Type:** repository migration. **Scope:** root workspace, active apps, docs,
deployment paths. **Depends on:** OS1 execution slot. **Status:** ✅ Landed `274f7f2`.

## Objective

Move the current active frontend from `fe/` to `apps/scene-editor/`, align the
monorepo around the emerging **World Lab** identity, and update references so the
repo no longer presents `fe/` as the active app path.

This is a filesystem and documentation migration, not a renderer rewrite.

## Current decisions

- Target repo/platform identity: **World Lab**.
- Target GitHub repo name: `world-lab`.
- Current `fe/` app becomes `apps/scene-editor/`.
- Current graph editor app becomes `apps/webgputoy/` and deploys as WebGPUToy at
  `webgputoy.ferreyrapons.com`.
- Scene editor public product name is still open; use functional naming until a
  product name is chosen.
- Keep the app directory as `apps/scene-editor/` regardless of final public brand.

## Files and updates

- Move `fe/` -> `apps/scene-editor/`.
- Root `package.json`
  - Rename root package to `world-lab-monorepo` if the repo name is confirmed.
  - Remove explicit `"fe"` workspace entry; rely on `"apps/*"` and `"packages/*"`.
  - Add root workspace scripts only if they are needed for migration verification;
    otherwise leave detailed release scripts for OS2.
- `apps/scene-editor/package.json`
  - Rename app package from `virtual-planet` to either
    `@virtual-planet/scene-editor-app` or the final scope chosen before npm prep.
  - Keep `"private": true`.
- `apps/graph-editor/package.json`
  - Move `apps/graph-editor/` -> `apps/webgputoy/`.
  - Rename the app package to `@virtual-planet/webgputoy-app`, unless the package
    scope is changed before OS1 executes.
  - Keep `"private": true`.
- `ecosystem.config.cjs`
  - Update built server path from `fe/build/index.js` to
    `apps/scene-editor/build/index.js`.
- `.gitignore`
  - Replace `fe/build`, `fe/.svelte-kit`, and `fe/.env*` with
    `apps/scene-editor/...`.
- Docs and coordination files
  - Update user-facing references to `fe/`, `cd fe`, and `fe/src/...`.
  - Keep historical references where they are intentionally describing old state.
  - Update `AGENTS.md`, `README.md`, `CLAUDE.md`, and relevant `_docs/**/*.md`.
- Root lockfile
  - Regenerate `package-lock.json` after the move.

## Required reference search

After the move, run searches equivalent to:

```sh
rg -n "\bfe/|cd fe|fe\\b|virtual-planet-monorepo|virtual_planet|Virtual Planet"
rg -n "apps/graph-editor|graph-editor-app|@virtual-planet"
```

Review each match manually. Do not blindly replace every `Virtual Planet` mention:
some should remain for the renderer/domain subsystem and project history.

## Gate

From the repo root:

```sh
npm install
npm run check --workspaces --if-present
npm run test --workspaces --if-present
npm run build --workspaces --if-present
```

At minimum, verify:

- `apps/scene-editor` installs and runs the old `fe` app.
- `apps/scene-editor` check/build pass.
- `apps/webgputoy` check/build pass.
- Existing package checks/tests still pass.
- PM2 build path is correct for the moved app.

## Out of scope

- Do not add the MIT license yet.
- Do not remove `fe.old/` yet.
- Do not publish npm packages.
- Do not rewrite renderer architecture.
- Do not finalize the scene editor product name.
