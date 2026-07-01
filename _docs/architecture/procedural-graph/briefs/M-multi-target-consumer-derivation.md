# Brief — Multi-target consumer/output derivation (unique per sink)

**Type:** 🔴 fix (multi-target compile — completes `f858fe4`) · **Packages:**
`@virtual-planet/graph` (`pipeline.ts`) · **Depends on:** preview multi-target buffer list ✅
(`f858fe4`, fixed the *list* only) · **Design authority:** `pipeline-as-graph.md` · **Contract
author:** Opus · **Recommended executor:** Cursor.

## Problem

`f858fe4` made `enumeratePreviewBuffers` list one buffer per `target.display` sink, but the
underlying **consumer/output derivation still collapses two sinks into one**:

- `outputNameForField` returns the shared constant `PIPELINE_IMAGE_OUTPUT_NAME` (`'pipeline_image'`)
  for **every** presentation when `doc.outputs` is empty.
- `consumerKey = \`${stage}:${type}:${outputs.join(',')}\`` — so two derived consumers are both
  `fragment:image:pipeline_image` → `effectiveConsumers` **de-dupes to one**.
- `effectiveOutputs` would likewise emit two outputs **named identically** (`pipeline_image`) —
  a name collision.

Net: for a two-target graph, `effectiveGraphDocument(doc).consumers` has **one** image
consumer, and the compiled-WGSL view / any compile-all-consumers path only sees one target.
(Repro: the Animated Worley sample, `053fd41` — two `target.display` sinks; its test documents
the collapse.)

**Same root cause defeats the preview buffer list on the effective doc.** The editor enumerates
buffers from `effectiveGraphDocument(graph)` (`GraphEditor.svelte:115`), not the raw doc. On the
effective doc `effectiveOutputs` yields **two outputs both named `pipeline_image`**; the
name-dedup in `enumeratePreviewBuffers` (`seenDeclaredNames` keyed by `output.name`) keeps one
**and** the sink loop then skips both sinks (their fields are in `declaredPipelineOutputs`) →
**one** `pipeline_image` buffer. Reproduced deterministically:
`enumeratePreviewBuffers(rawDoc)` = 2, but `enumeratePreviewBuffers(effectiveGraphDocument(doc))`
= 1. This is *the* "only one preview tab for two targets" symptom — `f858fe4`'s sink-keying only
holds on the raw doc.

## Fix

Make the derived **output name unique per sink** (presentation) when there is no matching
declared output. In `presentationForDisplay` (which has the `displayNode`), name the field
output per sink — e.g. `existing?.name ?? \`${PIPELINE_IMAGE_OUTPUT_NAME}_${displayNode.id}\``
— so:

- two presentations get **distinct** `outputName`s → `effectiveOutputs` yields two distinctly
  named outputs (no collision);
- their consumers get **distinct** `consumerKey`s (outputs differ) → `effectiveConsumers` keeps
  both. (Belt-and-suspenders: also include `consumer.id` — already unique `pipeline:<sink>` —
  in `consumerKey`.)

Single-target graphs must keep working (a lone sink can keep `pipeline_image`, or the suffixed
name — pick one and update any test asserting the literal `'pipeline_image'`). Keep
`enumeratePreviewBuffers` behavior (already keyed by sink).

## Gate

1. **graph:** for a two-`target.display` graph, `effectiveGraphDocument(doc).consumers` has
   **two** `type:'image'` consumers with distinct ids, and `effectiveOutputs` has two
   distinctly-named outputs; a single-target graph still derives one. Test.
2. **Preview buffers on the effective doc:** `enumeratePreviewBuffers(effectiveGraphDocument(
   twoTargetGraph))` returns **two** image buffers (one per sink) — not one `pipeline_image`.
   This is the user-visible gate; assert it directly. (The unique per-sink name removes the
   `seenDeclaredNames` collapse; simplify the enumeration if needed so sink identity wins.)
3. Restore the stronger assertion in `animatedWorleyGraph.test.ts` (two image consumers **and**
   two effective-doc preview buffers) that is currently softened with a NOTE.
3. `check` **and** `test` green for `graph` (+ `graph-editor` if names change); keep all prior
   tests green.
4. **Visual ⚠:** the compiled-WGSL view / preview for the two-target Worley sample resolves
   **each** target independently. Screenshot.

## Out of scope

Frame-graph multi-pass ordering / render-to-texture (`M-pass-graph-executor`); the preview
buffer list (already correct); per-target resolution.

## Handoff

→ Two render targets derive two consumers + two outputs end to end, so compile and preview
handle each independently — completing the multi-target work `f858fe4` started.
