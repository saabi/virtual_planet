# Scene editor layout — resizable pane zones

**Status:** implemented · **Scope:** `/scene/[...path]` shell layout (zones,
persistence, `@virtual-planet/subdivide`). **Related:**
[scene-routing.md](scene-routing.md) (URL mirrors scene tree; shell hosts the
type-dispatched editor),
[body-vs-viewport-state.md](body-vs-viewport-state.md) (viewport/camera state is
session-scoped, not saved with body data — the layout pane is view chrome, not
scene document data).

## Decision

The scene editor uses a **Blender-style resizable pane layout**: four named
**zones** map to Svelte snippets; the user can drag dividers, split panes with a
modifier+edge drag, swap zone content via pane headers, and have the arrangement
restored across sessions. Layout JSON is **user preference**, not part of the
scene document (`vp.systemScene`).

## Zones

Each pane carries an opaque `zone` string key. The host (`SceneEditorShell`)
registers snippets and labels:

| Zone key | Label | Content |
|----------|-------|---------|
| `outliner` | Outliner | `SystemTreePanel` — scene tree, save/reset, add/delete |
| `properties` | Properties | Node editor — fields, transform, drivers, appearance |
| `renderSettings` | Render | Vertical icon tabs: View (look + material debug), Quality (tessellation), Debug (overlays), Shading — session viewport prefs via `SceneViewportPrefs` |
| `viewport` | Viewport | `SceneViewport3D`, map inset, optional `FocusedBodyView` |

Default layout (`defaultSceneEditorLayout()`): horizontal split — left column
~22% stacks outliner (45%), properties (40%), render settings (15%); right
column ~78% is viewport.

Zone keys are validated on load: unknown zones in persisted JSON fall back to
`viewport` via `parseLayoutDocument(doc, 'viewport')`.

## Persistence

| Key | Value shape |
|-----|-------------|
| `virtual-planet:scene-layout:v1` | `{ version: 1, layout: LayoutDocument }` |

- **Version:** `LAYOUT_DOCUMENT_VERSION` from `@virtual-planet/subdivide`
  (bump only on incompatible JSON shape changes).
- **Load:** `loadSceneLayout()` in `layoutStorage.ts` — SSR returns default;
  browser reads localStorage, validates wrapper version, parses layout.
- **Save:** debounced 300 ms on `onlayoutchange` from `<Subdivide>`.
- **Failure:** corrupt JSON, private mode, or quota → silent fallback to
  `defaultSceneEditorLayout()`.

This key is separate from scene documents, session camera
(`virtual-planet:session:v1`), and render-quality prefs — see
[body-vs-viewport-state.md](body-vs-viewport-state.md) for what belongs in scene
vs session vs device prefs.

## `@virtual-planet/subdivide` package

Workspace package at `packages/subdivide/`. Layout tree engine ported from
[saabi/svelte-subdivide](https://github.com/saabi/svelte-subdivide) (LIL-1.0);
Svelte 5 components wrap the runtime.

**Exports:**

- `@virtual-planet/subdivide` — types, `buildRuntimeTree`, `serializeRuntime`,
  `parseLayoutDocument`, `defaultSceneEditorLayout`, `createDefaultLayout`, …
- `@virtual-planet/subdivide/Subdivide.svelte` — root layout host
- `Pane.svelte`, `Divider.svelte`, `PaneHeader.svelte` — pane chrome

**Layout document:** serializable tree of `group` (row/column) and `pane`
(`id`, `zone`, `pos`, `size` fractions). Host resolves `zone` → snippet; unlike
upstream `childProps`, zone is an opaque string into the host registry.

## Interactions

| Action | Input | Effect |
|--------|-------|--------|
| Resize | Drag divider | Updates pane `pos`/`size`; serializes on mouseup |
| Split | Cmd (Mac) / Ctrl + drag pane edge | Inserts new pane + divider at edge |
| Close pane | Drag divider until a pane hits zero size | Removes pane; merges siblings |
| Swap zone | Pane header `<select>` | Changes pane `zone`; re-renders snippet |

Modifier detection: `metaKey` on Mac, `ctrlKey` elsewhere (`isModifierPressed`).

Dev playground: `/dev/subdivide` (`fe/src/routes/dev/subdivide/+page.svelte`).

## File map

| Path | Role |
|------|------|
| `packages/subdivide/src/layout/` | Pure layout engine (build, parse, serialize, runtime) |
| `packages/subdivide/src/Subdivide.svelte` | Svelte 5 shell: rebuild on `layout` change, split/drag |
| `packages/subdivide/src/Pane.svelte` | Pane positioning, edge split detection |
| `packages/subdivide/src/Divider.svelte` | Divider hit targets |
| `packages/subdivide/src/PaneHeader.svelte` | Zone dropdown |
| `packages/subdivide/LICENSE` | LIL-1.0 attribution (upstream saabi/svelte-subdivide) |
| `fe/src/lib/planet/components/scene-editor/SceneEditorShell.svelte` | Scene editor host: zones, `bind:layout`, persist |
| `fe/src/lib/planet/components/scene-editor/layoutStorage.ts` | `SCENE_LAYOUT_KEY`, load/save, debounce |
| `fe/src/lib/planet/components/scene-editor/OutlinerPanel.svelte` | Outliner zone |
| `fe/src/lib/planet/components/scene-editor/PropertiesPanel.svelte` | Properties zone |
| `fe/src/lib/planet/components/scene-editor/RenderSettingsPanel.svelte` | Render settings zone |
| `fe/src/lib/planet/components/scene-editor/ViewportZone.svelte` | Viewport zone (3D + map + focused body) |
| `fe/src/lib/planet/components/controls/Range.svelte` | Slider row + numeric pill (planet/scene variants) |
| `fe/src/lib/planet/components/scene-editor/EditorVerticalTabs.svelte` | Super-section vertical icon tab rail + content pane |
| `fe/src/lib/planet/components/scene-editor/EditorTabIcon.svelte` | Inline SVG icon for tab buttons |
| `fe/src/lib/planet/components/scene-editor/editorTabIcons.ts` | Icon path registry (section id → SVG) |
| `fe/src/lib/planet/components/scene-editor/EditorSubsection.svelte` | `<details>` subsection wrapper |
| `fe/src/lib/planet/components/scene-editor/propertiesSections.ts` | Properties super-section registry |
| `fe/src/routes/scene/[...path]/+page.svelte` | Route page wrapping `SceneEditorShell` |

## Integration with routing

[scene-routing.md](scene-routing.md) resolves the URL to a scene node and
dispatches the editor by node kind. `SceneEditorShell` is the **chrome** around
that dispatch: pane sizes and zone placement persist per browser; selection,
camera, and body data follow routing and session rules in
[body-vs-viewport-state.md](body-vs-viewport-state.md).

## Panel collapse (parity with `/planet`)

Super-sections use a **vertical icon tab rail** on the left (one active tab at a
time; section titles appear as native `title` tooltips on hover). Inner blocks
remain independent `<details>` subsections while keeping scene-editor colors.

### Properties (`PropertiesPanel`)

Fixed header: breadcrumb + node name. Below, a left **icon tab rail** switches
the active super-section (`openSuperSection`; clicking a tab selects it, does not
deselect). Super-sections are pruned by node kind via `visiblePropsSections()` in
`propertiesSections.ts` (each entry includes an `icon` id from `editorTabIcons.ts`):

| Super-section | When visible | Subsections |
|---------------|--------------|-------------|
| Transform | node selected | Position · Rotation · Scale (`TransformEditor` channels) |
| Node | `editor.mode === 'schema'` | Schema fields (`SchemaForm`) |
| Motion | node selected | Driver · Bindings · Constraints |
| Appearance | body with appearance | Preset row in header; shape/material blocks from `PARAM_EDITOR_SECTIONS` via `ParamSliderRow` (`Range` / `LogRange`, live numeric pill); LOD |
| Atmosphere | body with appearance | Design (`AtmosphereEditor` — `bodyAtmosphereSliders`, same row layout) |
| Actions | body with appearance | Procedural render · Handoff to `/planet` |

Default open super-section: `transform`.

### Outliner (`SystemTreePanel`)

Parent nodes show a chevron (▸/▾). Chevron toggles collapse; name click
selects. Descendants of any collapsed ancestor are hidden (`visibleSceneTreeRows`
in `sceneTree.ts`). On selection change, all ancestors of the selected node are
expanded. Collapse state is session-only (`collapsedIds` in the panel).

### Render (`RenderSettingsPanel`)

Super-section icon tabs: **View** (default), **Quality**, **Debug**, **Shading**.
Each tab pane contains `<details>` subsections (multiple may stay open).

| Super-section | Subsections | State owner |
|---------------|-------------|-------------|
| View | Look (`lookMode`) · Material view (`materialDebug`) | Page `$state` |
| Quality | Tessellation (detail, budget, max res/depth) | `viewportPrefs.tessellation` |
| Debug | Wireframe · face colors · patch borders · ring colors | `viewportPrefs.debug` |
| Shading | Shadows · exposure · roughness · water gloss · fog | `viewportPrefs.materialOverrides` |

Slider rows in Appearance, Atmosphere, and Render (tessellation/shading) reuse
shared `Range` / `LogRange` controls from `fe/src/lib/planet/components/controls/`
with `variant="scene"` (purple numeric pill, parity with `/planet` sidebar).

`SceneViewportPrefs` (`viewportPrefs.ts`) is owned by `+page.svelte` and passed
through `SceneEditorShell` → `RenderSettingsPanel` / `ViewportZone` →
`SceneViewport3D` → `buildProceduralRenderInput`. Not persisted in v1; see
[body-vs-viewport-state.md](body-vs-viewport-state.md) for session vs document
ownership.

Shared primitives: `EditorVerticalTabs.svelte`, `EditorTabIcon.svelte`,
`editorTabIcons.ts`, `EditorSubsection.svelte` in `scene-editor/`.
