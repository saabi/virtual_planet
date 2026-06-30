# Brief — Reliable recompile + real source for every node type

**Type:** editor bug-fix + completeness (Tier 1) · **Package:**
`@virtual-planet/graph-editor` · **Depends on:** M-primitive-immutability ✅ (real source
for primitives), groups ✅, pipeline nodes ✅ · **Design authority:** [editor.md](../editor.md)
· **Contract author:** Opus · **Recommended executor:** Cursor (⚠ visual gate).

## Objective

Two reliability gaps that undermine "fully functional pipeline":

1. **Recompile/re-render is unreliable** (tracked in pending_issues): editing a node's code,
   editing a param, or rewiring does **not** always trigger a preview update. Edits must
   reliably recompile → re-render the preview **and** the compiled-WGSL view.
2. **Real source isn't shown for every node type.** CodeView shows real WGSL for built-in
   primitives ✅, but **groups** (their generated function source) and **pipeline nodes**
   (`geometry.*`/`buffer.*`/`stage.*`/`target.*`) must show their **real** source too — never
   a fabricated stub or a blank.

## Part 1 — Reliable recompile (the bug)

- Trace the preview/compile reactivity: the preview + compiled-WGSL panel must recompute on
  every relevant change — node param edit, primitive **code** edit (re-register ripples to
  the node), **edge add/remove/rewire**, node add/delete, and sample/document load.
- Make the recompute keyed on a stable graph signature (so identical no-ops don't thrash,
  but every real change does fire). Debounce, don't drop.
- Confirm both **CPU preview** and **GPU/effect/pipeline preview** paths recompute.

## Part 2 — Real source for groups + pipeline nodes (`primitiveSources.ts`)

- For a **group** node, CodeView shows its **generated WGSL function** (`groupToFunction` /
  `buildGroupModule` output) — the real composite, read-only (built-in groups) or editable
  (user groups, later).
- For a **pipeline node** (`geometry.plane`, `stage.fragment`, …), CodeView shows its real
  module source. If a node legitimately has no standalone WGSL (a pure structural node),
  show an explicit, honest "(no WGSL — structural node)" notice — **never** a fabricated
  stub (the `use-deps`/no-stub discipline applies).

## Gate

1. **Headless:** `getPrimitiveSource('math.remap')` returns the real group-generated source
   (not a stub); `getPrimitiveSource` for a pipeline node returns its real module or the
   explicit "structural node" notice; a snapshot test asserts no fabricated `return 0.0;`
   stub is ever returned for a registered node.
2. **Visual ⚠:** edit a node's code / a param / rewire an edge → the preview **and** the
   compiled-WGSL panel update each time; select a group node and a pipeline node → CodeView
   shows real source. Screenshot of an edit propagating.
3. `npm run check`/`test -w @virtual-planet/graph-editor` (sceneFree green); `apps/graph-editor` builds.

## Out of scope

Source-map from compiled WGSL back to nodes; undo/redo. **No fabricated stubs anywhere.**

## Handoff

→ Every node shows its real code and every edit reliably flows to the preview + compiled
WGSL — the editor is honest and live (Tier 1 complete with the other two).
