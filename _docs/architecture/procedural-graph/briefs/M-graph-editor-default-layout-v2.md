# Brief — Graph editor default layout v2

**Type:** touch-up (editor shell) · **Package:** `@virtual-planet/graph-editor` ·
**Depends on:** M9d.1 layout persistence ✅ · **Contract author:** Opus ·
**Recommended executor:** Cursor.

## Problem

The shipped default layout stacks preview/code/compiled in the **center** column beside the
canvas, with markup in the right stack. Authors working on ShaderToy-style graphs want:

- **Palette** — narrow left strip (~11% width)
- **Canvas + Code** — dominant center column (~67%), canvas over code (~50/50)
- **Inspector + Validation + Preview** — right column (~22%), preview largest (~59% of column)

`compiled` and `markup` remain available via pane context menus (M9d.2) but are not in the
default tree.

## Fix

1. Replace `defaultGraphEditorLayout()` proportions/structure with the v2 tree (author-exported
   reference in task thread).
2. Bump `GRAPH_EDITOR_LAYOUT_KEY` from `:v1` to `:v2` so stored v1 chrome is ignored and
   first load after deploy gets the new default (mirrors scene editor falling through to v2
   when stored version mismatches).
3. Update layout tests that assumed palette was a top-level pane.

## Files

- `packages/graph-editor/src/defaultLayout.ts` — new default tree
- `packages/graph-editor/src/defaultLayout.test.ts` — zone presence + column proportions *(new)*
- `packages/graph-editor/src/layoutStorage.ts` — `GRAPH_EDITOR_LAYOUT_KEY` → `:v2`
- `packages/graph-editor/src/layoutStorage.test.ts` — nested palette group in round-trip test

## Gate

1. `defaultLayout.test.ts`: default includes zones
   `palette`, `canvas`, `code`, `inspector`, `validation`, `preview`; root has three column
   groups at ~11% / ~67% / ~22%; center column splits canvas/code ~50/50; right column puts
   preview last and largest.
2. `npm run check -w @virtual-planet/graph-editor` **and** `npm test -w @virtual-planet/graph-editor` green.
3. **Manual ⚠:** fresh load (or cleared layout key) shows palette | canvas/code | inspector stack
   with preview on the right.

## Out of scope

Per-document layout; changing zone context menus; removing compiled/markup zones from the editor.

## Done when

Gate green + task board archived.

## Handoff

→ **Swap menu closes on click-outside** (`M-swap-menu-click-outside.md`) · Cursor · next
ready UX touch-up on the task board.
