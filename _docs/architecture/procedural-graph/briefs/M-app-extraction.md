# Brief — Extract standalone editor to `apps/graph-editor`

**Type:** tracked tech-debt (editor ADR) · **Packages:** new `apps/graph-editor`
workspace; `fe/` (remove the route) · **Depends on:** editor stack stable (done) ·
**Design authority:** [editor-and-scene-integration.md](../editor-and-scene-integration.md)
· **Contract author:** Opus · **Recommended executor:** Cursor. **Do before M14/M16.**

## Objective

The standalone editor currently lives as the scene-free route `fe/src/routes/graph-editor`.
Move it into a real `apps/graph-editor` SvelteKit workspace so it is independently
deployable (the editor ADR's "standalone app stays scene-free" requirement; needed for
WebGPUToy and headless CI). The reusable logic already lives in `@virtual-planet/graph-editor`
— this is a thin host-app move, not a rewrite.

## Files

- `apps/graph-editor/` — new SvelteKit app *(new)*: `package.json` (name
  `@virtual-planet/graph-editor-app` or `apps/graph-editor`; deps:
  `@virtual-planet/{graph,schema,compiler,runtime-cpu,runtime-webgpu,graph-editor,subdivide}`,
  svelte/kit/vite, `@xyflow/svelte`, codemirror), `svelte.config.js`, `vite.config.ts`,
  `tsconfig.json`, `src/routes/+page.svelte` (move the current route body here),
  `src/app.html`. Mirror `fe/`'s adapter + WGSL/glslify vite plugins **only if** the editor
  needs them (it imports compiled WGSL via runtime-webgpu — check and include
  `vite-wgsl.ts` equivalent if required).
- Root `package.json` — add `apps/*` to `workspaces` *(update)*.
- `fe/src/routes/graph-editor/` — **remove** (and any fe-only glue) *(delete)*.

## Constraints

- The app imports **only** the `@virtual-planet/*` packages above — no `fe/` planet/scene
  imports (the `sceneFree` guard already enforces this for the package; keep the app equally clean).
- No behavior change: same panels, CPU/GPU preview, markup/code, persistence, vegetation
  preview. This is a relocation.
- Don't break `fe` — confirm nothing else imports the removed route.

## Gate

1. `npm install` (root) links the new workspace.
2. `npm run check`/`build` in `apps/graph-editor` green; `npm run dev` serves the editor.
3. `npm run check -w fe` green after route removal (nothing references it).
4. All `@virtual-planet/*` package gates unchanged/green.
5. **Manual ⚠:** the standalone app loads, all panels work, GPU preview renders — same as
   the old `/graph-editor` route.

## Out of scope

Embedding the editor back into `fe`/`/scene` (that's M16 host composition, via document
refs — keep separate). No new editor features.

## Handoff

→ Update [STATUS.md](../STATUS.md): clear the `apps/graph-editor` deviation from the
tech-debt table. Then **M14** (document/session model) / **M15** (MCP) are unblocked.
