# Brief — Preview lists every render target (one buffer per sink)

**Type:** fix (preview enumeration) · **Packages:** `@virtual-planet/graph-editor`
(`previewBuffers.ts`) · **Depends on:** preview buffer list ✅, consumer derivation ✅ ·
**Design authority:** `pipeline-as-graph.md` · **Contract author:** Opus · **Recommended
executor:** Cursor.

## Problem

A graph with **two `target.display` sinks** lists only **one** buffer in the preview pane. In
`enumeratePreviewBuffers` (`previewBuffers.ts`) each buffer is keyed by its **field-output**
source (`portKey(fieldOutput)`), not by the sink:

- `effectiveOutputs` merges two presentations that share a field output into one output;
- the sink loop then `continue`s on the second sink because `portKey(fieldOutput)` is already
  in `seenSources`.

So two targets fed by the **same upstream field** collapse to one. A render **target** is the
identity here — the user placed two `target.display` nodes and expects two preview entries,
even if they show the same field. (Two targets with *different* fields also collapse only if
they happen to share a source — but the intent is: **one buffer per pipeline sink**.)

## Fix

In `enumeratePreviewBuffers`, enumerate **one buffer per pipeline-target sink**, keyed by the
**sink node id** (never by the shared field output):

- Emit a buffer for **every** `isPipelineTarget` node, `id`/key = the display node id (unique,
  matches the derived consumer id `pipeline:<displayNodeId>`); its `source` stays the sink's
  own `fieldOutput` (so it renders that target's field — two sinks sharing a field render the
  same, which is correct). Give each a **disambiguating label** (e.g. the display node's label/
  id, or the field name + target) so duplicates are distinguishable in the selector.
- Emit value-output buffers only for outputs that are **not** a pipeline presentation's
  synthetic output (real field/scalar-graph outputs), keyed by field output as today.
- Don't let a shared field-output key suppress a distinct sink. Restructure the `seenSources`
  logic so sink identity and value-output identity don't cross-collapse.

`effectiveOutputs`/`derivePipelineConsumers` already yield one presentation **per** sink
(`pipeline:<displayNodeId>` consumer ids), so selecting a given buffer must compile/render
**that** sink's consumer — verify the selected buffer maps to its own consumer/field, not a
global first.

## Gate

1. **Unit:** a graph with two `target.display` sinks → `enumeratePreviewBuffers` returns
   **two** buffers with distinct ids, **including** the case where both fragments draw from one
   shared field output; two sinks with different fields → two buffers with different sources.
   Tests in `graph-editor`.
2. **Selection→render:** each buffer's `source`/consumer resolves to its own sink's field (not
   the first sink) — assert the mapping (headless where possible).
3. `check` **and** `test` green for `graph-editor`; keep all prior tests green.
4. **Visual ⚠:** the two-target graph in the report lists **two** entries in the preview
   buffer selector; selecting each shows that target. Screenshot.

## Out of scope

Simultaneous multi-pane preview (one active buffer at a time is fine); frame-graph ordering /
multi-pass targets (`M-pass-graph-executor`); naming UX for targets beyond a disambiguating
label.

## Handoff

→ Every render target appears in the preview selector and renders independently, so multi-
target graphs are inspectable. Sets up multi-pass / render-to-texture previews later.
