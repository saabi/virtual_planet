# Brief — Extract shared editor chrome to `@virtual-planet/editor-ui`

**Type:** decoupling / shared package · **Packages:** new `@virtual-planet/editor-ui`;
`fe/` (re-point imports); `@virtual-planet/graph-editor` (consume) · **Depends on:** —
· **Design authority:** [editor.md](../editor.md),
[parameter-and-form-schema.md](../parameter-and-form-schema.md),
[editor-and-scene-integration.md](../editor-and-scene-integration.md) · **Contract
author:** Opus · **Recommended executor:** Cursor.

## Problem

The collapsible section / super-section / vertical-tab chrome the graph editor wants for
its **palette categories** and **inspector param groups** lives in
`fe/src/lib/planet/components/` — which `@virtual-planet/graph-editor` **cannot import**
(it must stay scene-free; the `sceneFree` guard enforces it). The components are needed in
both apps → they must move to a **shared package**. This resolves the placement the param
ADR left open ("graph-editor *or* schema-ui").

## What extracts (already generic — verified)

These have no planet/scene coupling (only `Snippet` children / labels):

- `EditorSuperSection.svelte`, `EditorSubsection.svelte` — collapsible section chrome
- `EditorVerticalTabs.svelte`, `EditorTabIcon.svelte` + `editorTabIcons.ts` — vertical tabs

**Does NOT extract:** `EditorParamSection.svelte` — it imports `PlanetParameters` /
`paramEditorSchema` / `ParamSliderRow` (the **legacy** planet param sliders the param ADR
retires). The graph editor uses the generic sections + the schema-driven `SchemaForm`
(param ADR), **not** `EditorParamSection`.

## Package

```
packages/editor-ui/   @virtual-planet/editor-ui
  src/
    Section.svelte         (← EditorSuperSection; generic, label + collapsed + children)
    Subsection.svelte      (← EditorSubsection)
    VerticalTabs.svelte    (← EditorVerticalTabs)
    TabIcon.svelte, tabIcons.ts
    index.ts
  package.json (peerDep svelte ^5; NO @virtual-planet/{graph,schema} — pure chrome)
  tsconfig.json
```

Svelte-only, framework-chrome — **no** graph/schema/scene dependency (keep it the generic
layer both the schema form package and graph-editor sit on). Mirror `subdivide`'s package
shape.

## Migration

- Move the four generic components into `editor-ui` (rename to the neutral names above; keep
  a thin re-export in `fe/` or update `fe/` imports — prefer updating imports).
- `fe/` scene editor imports the components from `@virtual-planet/editor-ui` (behaviour
  unchanged).
- `graph-editor` adds the dep (the `sceneFree` guard already allow-lists
  `@virtual-planet/*`; add `editor-ui` to its allow-list pattern).

## Gate

1. `editor-ui` builds: `npm run check`/`test` green (a render/smoke test of `Section`
   collapse).
2. `fe` check green; the scene editor renders unchanged (manual: `/scene` sections still
   collapse).
3. `graph-editor` check/test green; `sceneFree.test.ts` updated to allow `editor-ui` and
   still green.
4. Root `npm install` links the new workspace.

## Out of scope

Extracting `EditorParamSection` (legacy, retires with `paramEditorSchema`); the schema-form
generator itself (param ADR — may later live in `editor-ui` or a thin `schema-ui` on top;
not this brief); restyling. **Pure relocation + re-point.**

## Handoff

→ Shared chrome exists. **Palette categorization** ([M-planet-primitive-harvest.md](./M-planet-primitive-harvest.md),
[M-usegpu-primitive-harvest.md](./M-usegpu-primitive-harvest.md)) and the schema-driven
**inspector param sections** can now use `Section`/`Subsection` in graph-editor. Update the
param ADR placement note to point here.
