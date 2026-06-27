# Brief — M9d.3: Syntax highlighting for code panes

**Milestone:** M9d.3 ([M9d-editor-shell-polish-proposal.md](./M9d-editor-shell-polish-proposal.md) →
Architect decision §3–4) · **Package:** `@virtual-planet/graph-editor` (primary);
one-line `@virtual-planet/subdivide` touch for context-menu policy · **Depends on:**
M9d.1 ✅, M9d.2 ✅, code-panel overflow grid fix ✅ · **Design authority:**
[editor-and-scene-integration.md](../editor-and-scene-integration.md),
[parameter-and-form-schema.md](../parameter-and-form-schema.md),
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md) · **Contract author:**
Opus · **Recommended executor:** Composer (Svelte + bundle-size care).

## Objective

Replace the plain `<textarea>` editors in `CodeView.svelte` (primitive WGSL+YAML
source) and `MarkupView.svelte` (PlanetGraph markup) with **CodeMirror 6** while
preserving all existing behavior: live markup parse, primitive Save/Revert, dirty
tracking, pane context menus, and the CSS grid layout that bounds editors inside
`subdivide` panes.

Syntax coloring is **presentational only**. It is not a compiler input, not an owned
WGSL AST, and not part of the shared param-form generator
([parameter-and-form-schema.md](../parameter-and-form-schema.md)). WGSL highlighting
is explicitly approximate per
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md).

`packages/graph-editor` stays **scene-free** (`sceneFree.test.ts`). CodeMirror is a
third-party UI dependency — allowed. Do **not** create `@virtual-planet/code-editor`
yet (YAGNI); keep the wrapper extraction-ready.

---

## CodeMirror dependencies (`graph-editor` only)

Add to `packages/graph-editor/package.json` `dependencies` — **narrow imports**,
no `codemirror` meta-package (avoids pulling unused language packs):

| Package | Purpose |
|---------|---------|
| `@codemirror/view` | `EditorView`, `keymap`, `drawSelection` |
| `@codemirror/state` | `EditorState`, `Compartment` |
| `@codemirror/language` | `syntaxHighlighting`, `StreamLanguage`, `indentUnit` |
| `@codemirror/commands` | `defaultKeymap`, `historyKeymap`, `history` |
| `@codemirror/lang-xml` | PlanetGraph markup |
| `@lezer/highlight` | `styleTags`, `tags` for custom WGSL highlighter |

**Do not add:** `@codemirror/lint`, `@codemirror/autocomplete`, Lezer WGSL grammar,
Monaco, Prism, Shiki, or `@codemirror/lang-javascript`.

`@codemirror/lang-yaml` is **optional** — only add if the implementer can nest it
inside the `/*---` … `---*/` frontmatter region without pulling >~15 KB gzip for no
gain. Default path: approximate YAML keys via the same `StreamLanguage` state machine
as the WGSL body (see below).

**Bundle boundary:** deps live in `graph-editor/package.json` only. `fe/` gains
CodeMirror transitively when Vite bundles `/graph-editor` — no new `fe/` dependency.
`@virtual-planet/{graph,compiler,runtime-*,subdivide}` packages remain CodeMirror-free.

---

## Wrapper API (`CodeMirrorEditor.svelte`)

Thin, **graph-editor-agnostic** Svelte wrapper (no imports from `GraphEditor`,
`primitiveEditor`, or markup modules). Extraction-ready for a future
`@virtual-planet/code-editor` hoist.

### File

`packages/graph-editor/src/codemirror/CodeMirrorEditor.svelte` *(new)*

### Props

```ts
export type CodeMirrorLanguage = 'planet-markup' | 'primitive-source';

interface Props {
	/** Document text (two-way). */
	value?: string;
	language: CodeMirrorLanguage;
	/** When true, suppresses onchange feedback loops during host-driven resets. */
	onchange?: (value: string) => void;
	/** Passed to EditorView; default false. */
	readOnly?: boolean;
	/** Extra class on the host div (for grid row styling). */
	class?: string;
}
```

### Behavior

- Renders a single host `<div class="cm-host">` filling the grid `1fr` row.
- Creates `EditorView` **onMount**; calls `view.destroy()` **onDestroy**.
- **Inbound sync** (`value` changes from parent — module switch, Revert, Resync):
  replace document only when `view.state.doc.toString() !== value`, preserving
  selection when possible (`ChangeSet` or `dispatch` with `selection: { anchor, head }`
  remap). Set an internal `syncing` flag so the resulting transaction does not call
  `onchange`.
- **Outbound sync** (`EditorView.updateListener`): on `docChanged`, call
  `onchange?.(view.state.doc.toString())` unless `syncing`.
- Extensions: `graphEditorTheme`, language extension for `language`, `history`,
  `defaultKeymap`, `historyKeymap`, `drawSelection`, `EditorView.lineWrapping`,
  `EditorState.tabSize.of(2)`, `indentUnit.of('  ')`.
- `spellcheck={false}` equivalent via EditorView content attributes.
- **No** line numbers in v1 (keeps chrome compact). **No** minimap.

### Host CSS (grid-safe)

The wrapper host (and `:global(.cm-editor)` inside it) must match the overflow brief:

```css
.cm-host {
	box-sizing: border-box;
	min-height: 0;
	height: auto;
	width: 100%;
	overflow: hidden;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 4px;
}
:global(.cm-host .cm-editor) {
	height: 100%;
}
:global(.cm-host .cm-scroller) {
	overflow: auto;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 10px;
	line-height: 1.45;
}
```

Parent panels (`.code-view` / `.markup`) keep their existing `display: grid;
grid-template-rows: auto 1fr; min-height: 0` — do not reintroduce `height: 100%` on
the panel root (subdivide `flex: 1` sizes it).

---

## Language modules

### Shared theme

`packages/graph-editor/src/codemirror/theme.ts` *(new)*

- `graphEditorTheme: Extension` — `EditorView.theme` aligned with current panes:
  background `#0d1018`, text `#dbe4ff`, caret `#dbe4ff`, selection
  `rgba(93, 140, 255, 0.25)`, gutter hidden.
- `graphEditorHighlightStyle: HighlightStyle` — maps Lezer/`tags` to colors:
  keywords `#7aa2ff`, strings `#9ece6a`, comments `#565f89`, numbers `#ff9e64`,
  types `#2ac3de`, tags/attributes (XML) `#bb9af7` / `#7dcfff`.

Re-export from `packages/graph-editor/src/codemirror/index.ts` *(new)*.

### PlanetGraph markup — XML mode

`packages/graph-editor/src/codemirror/planetMarkupLanguage.ts` *(new)*

```ts
import { xml } from '@codemirror/lang-xml';

/** XML highlighting for <PlanetGraph> markup (tags, attributes, strings). */
export function planetMarkupLanguage(): Extension;
```

Returns `xml()` plus `syntaxHighlighting(graphEditorHighlightStyle)`. PlanetGraph is
XML-shaped; no custom Lezer grammar in M9d.3.

### Primitive source — composite frontmatter + WGSL

`packages/graph-editor/src/codemirror/primitiveSourceLanguage.ts` *(new)*

Primitive sources use a **comment-wrapped YAML frontmatter** delimiter (see
`primitiveSources.ts`):

```text
/*---
id: noise.perlin3d
entry: perlin3d
…
---*/
fn perlin3d(…) -> f32 { … }
```

`primitiveSourceLanguage()` returns one `StreamLanguage` (or equivalent) extension
that:

1. **Frontmatter region** — from `/*---` through `---*/` (inclusive delimiters):
   highlight YAML-like keys (`/^[\w.-]+:/`), comments (`#…`), and scalars
   (strings/numbers). Approximate is fine.
2. **WGSL body** — everything after `---*/`: delegate to `wgslStreamLanguage`.

Export `splitPrimitiveSource(text): { frontmatter: string; body: string }` for tests.

### WGSL — minimal visual-only `StreamLanguage`

`packages/graph-editor/src/codemirror/wgslStreamLanguage.ts` *(new)*

```ts
/** Presentational WGSL highlighting only — not a semantic parse. */
export const wgslStreamLanguage: LanguageSupport;
```

Token rules (non-exhaustive, case-sensitive where WGSL is):

| Token class | Examples |
|-------------|----------|
| keywords | `fn`, `var`, `let`, `const`, `struct`, `return`, `if`, `else`, `for`, `while`, `loop`, `switch`, `case`, `break`, `continue`, `true`, `false` |
| types | `f32`, `i32`, `u32`, `bool`, `vec2`, `vec3`, `vec4`, `mat2x2`, `mat3x3`, `mat4x4`, `texture_2d`, `sampler` |
| attributes | lines starting with `@` (`@vertex`, `@fragment`, `@compute`, `@workgroup_size`, …) |
| comments | `//…`, `/* … */` |
| numbers | `/\d+(\.\d+)?([eE][+-]?\d+)?[fu]?/` |

**Out of scope:** spec-accurate WGSL lexer, type checking, `@use` module resolution,
or sharing logic with `@virtual-planet/compiler`. Never import compiler packages from
language modules.

---

## Panel integration

### `CodeView.svelte` *(update)*

- Replace `<textarea class="editor">` with:

```svelte
<CodeMirrorEditor
	class="editor"
	language="primitive-source"
	bind:value={draft}
	onchange={(next) => {
		draft = next;
		dirty = true;
		status = null;
	}}
/>
```

- Remove textarea-specific `onInput`. Keep header, Save, `registerActions`, `$effect`
  module reload (`getPrimitiveSource`), and `applyPrimitiveSource` save path
  **unchanged**.
- Drop textarea-only CSS; keep `.editor` as the grid row class on the wrapper.

### `MarkupView.svelte` *(update)*

- Replace `<textarea class="code">` with:

```svelte
<CodeMirrorEditor
	class="code"
	language="planet-markup"
	bind:value={draft}
	onchange={(next) => {
		draft = next;
		editing = true;
		scheduleParse();
	}}
/>
```

- Keep debounced `parseGraphMarkup` (300 ms), `editing` flag, graph→draft resync,
  and `registerActions` **unchanged**.

### Subdivide context-menu policy *(one-line)*

`packages/subdivide/src/Pane.svelte` — extend `isEditableTarget` to return true for
`.cm-editor` and `.cm-content` so right-click inside CodeMirror keeps the browser /
CM default and does not open the pane zone menu (same policy as `<textarea>`).

---

## Svelte lifecycle (pinned pattern)

Implementors must follow this pattern in `CodeMirrorEditor.svelte` to avoid cursor
jumps and feedback loops:

```ts
let view = $state<EditorView | null>(null);
let hostEl = $state<HTMLDivElement | null>(null);
let syncing = false;

onMount(() => {
	view = new EditorView({ state: createState(value ?? ''), parent: hostEl!, … });
});

onDestroy(() => view?.destroy());

$effect(() => {
	const v = value ?? '';
	if (!view || syncing) return;
	if (view.state.doc.toString() === v) return;
	syncing = true;
	view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
	syncing = false;
});
```

Use `updateListener` (not DOM `input` events) for outbound changes. Do not recreate
`EditorView` on every `value` change.

---

## Files

| File | Action |
|------|--------|
| `packages/graph-editor/package.json` | add `@codemirror/*`, `@lezer/highlight` |
| `packages/graph-editor/src/codemirror/index.ts` | re-exports |
| `packages/graph-editor/src/codemirror/theme.ts` | dark theme + highlight style |
| `packages/graph-editor/src/codemirror/planetMarkupLanguage.ts` | XML mode |
| `packages/graph-editor/src/codemirror/wgslStreamLanguage.ts` | minimal WGSL StreamLanguage |
| `packages/graph-editor/src/codemirror/primitiveSourceLanguage.ts` | frontmatter + WGSL composite |
| `packages/graph-editor/src/codemirror/wgslStreamLanguage.test.ts` | tokenizer gate |
| `packages/graph-editor/src/codemirror/primitiveSourceLanguage.test.ts` | delimiter split gate |
| `packages/graph-editor/src/codemirror/theme.test.ts` | exports smoke |
| `packages/graph-editor/src/CodeMirrorEditor.svelte` | wrapper |
| `packages/graph-editor/src/CodeView.svelte` | use wrapper |
| `packages/graph-editor/src/MarkupView.svelte` | use wrapper |
| `packages/subdivide/src/Pane.svelte` | `.cm-editor` editable-target guard |

**Do not touch:** `packages/graph`, `compiler`, `runtime-*`, `fe/` planet shader
editors, `InspectorPanel` / `SchemaForm`, Graph IR, primitive save semantics.

---

## Gate

### Automated

```sh
npm run check -w @virtual-planet/graph-editor
npm test -w @virtual-planet/graph-editor   # incl. sceneFree.test.ts
npm run check -w @virtual-planet/subdivide
npm test -w @virtual-planet/subdivide
npm run check -w fe
```

### Headless tests (new)

1. **`primitiveSourceLanguage.test.ts`** — `splitPrimitiveSource` extracts YAML block
   and WGSL body from `noise.perlin3d` fixture; frontmatter delimiter lines detected.
2. **`wgslStreamLanguage.test.ts`** — highlight stream assigns `keyword`/`type` tags to
   `fn` and `vec3<f32>` in a sample line (use `@codemirror/language` highlight helpers
   or snapshot token classes).
3. **`theme.test.ts`** — `graphEditorTheme` and `planetMarkupLanguage` export without
   throw.
4. **`sceneFree.test.ts`** — still green (no new forbidden imports).

No vitest test is required to mount a real `EditorView` (optional `skipIf` DOM test).

### Manual ⚠ (`/graph-editor`)

1. **Markup pane** — `<PlanetGraph>`, `<Node>`, attribute names visibly colored;
   editing still updates the graph after debounce; Validation panel reflects errors.
2. **Primitive pane** — frontmatter keys (`id:`, `entry:`) colored differently from WGSL
   `fn` / `vec3<f32>`; **Save** persists edits; module picker reload resets draft without
   stale highlighting.
3. **Layout** — both editors fill their pane, scroll internally, no bottom clip at
   multiple pane sizes (regression check for M9d overflow fix).
4. **Context menu** — right-click inside editor does **not** open subdivide zone menu;
   right-click pane chrome still does.
5. **Bundle** — `npm run build -w fe` succeeds; no duplicate-`@codemirror` resolution
   errors.

---

## Out of scope

- LSP, autocomplete, diagnostics squiggles, hover tooltips (future **M9e**).
- Lezer WGSL grammar or compiler-linked parsing.
- Read-only diff view; minimap; line numbers; multiple cursors.
- Replacing `fe/` planet WGSL/GLSL editors or `SchemaForm` inspectors.
- New Graph IR fields; YAML schema validation in the editor.
- Hoisting to `@virtual-planet/code-editor` (wrapper must stay import-clean for later).
- Changing `applyPrimitiveSource`, `parseGraphMarkup`, or primitive frontmatter format.

---

## Done when

`graph-editor` + `subdivide` + `fe` checks are green; manual gates pass; both panes
use CodeMirror with language-appropriate highlighting; all M9d.1/M9d.2 behaviors
remain intact.

## Handoff

→ **M9d complete** (optional backlog: palette search, CodeView module persistence in
chrome, `@virtual-planet/code-editor` hoist) · or **M9e — editor diagnostics** if
architect wants squiggles next · executor: Opus to triage backlog vs M12/M13 priority.
