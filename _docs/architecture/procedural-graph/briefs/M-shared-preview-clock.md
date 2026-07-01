# Brief — Shared preview clock (synced uniforms across panes)

> **⛔ SUPERSEDED by `M-single-loop-preview.md`.** Do not run. One render loop subsumes the
> shared clock (one loop = one clock); a shared clock while panes still render independently is
> throwaway per-pane-execution infra. Kept for rationale/history only.

**Type:** editor UX · **Packages:** `@virtual-planet/graph-editor` (new `previewClock.ts`,
`EffectPreviewPanel.svelte`) · **Depends on:** per-pane preview ✅ (`b73e6b3`) · **Design
authority:** `editor.md`, `pipeline-as-graph.md` (ShaderToy host inputs) · **Contract author:**
Opus · **Recommended executor:** Cursor.

## Problem

Each preview pane runs an **independent** ShaderToy clock — `EffectPreviewPanel.svelte` holds
its own `startTime = performance.now()` (line 26/54), its own `frame` counter (`iFrame: frame++`,
line 64/81), and its own rAF loop. So two panes of the same (or different) target animate
**out of phase** — `iTime`/`iFrame` differ per pane. They should be **synced by default** (all
panes share one clock), with an option to unsync later.

## Fix

### Part 1 — Shared clock (synced by default)

Add a `previewClock.ts` module: a **single** source of `iTime`/`iFrame` for all preview panes.
- One shared `startTime` (editor mount) → `iTime = (now - startTime) / 1000`; a shared
  `iFrame` incremented by **one** driver (a single rAF/interval in the module), exposed
  reactively.
- `EffectPreviewPanel` **reads the shared clock** for `iTime`/`iFrame` instead of its own
  `startTime`/`frame`. Remove the per-instance clock state; keep each panel's own rAF *render*
  loop, but it samples the shared clock so all panes use the same time at a given moment.
- **`iMouse` stays per-pane** (it's the local pointer over each canvas) — only the animation
  clock (`iTime`/`iFrame`) is shared. (Note this in the panel.)

Result: two Effect panes animate in lockstep (same `iTime` phase), whether showing the same or
different outputs.

### Part 2 — Seam for per-pane unsync (design now, UI later)

Structure the clock so a pane can opt into a **local** clock (its own `startTime`/`frame`)
instead of the shared one — e.g. `previewClock` supports a per-pane override, default shared.
The **toggle UI** (a per-pane "unsync clock" control, persisted in the per-pane chrome) is a
**follow-on** — out of scope here; just don't hardcode the shared clock in a way that blocks it.

## Gate

1. **Unit:** `previewClock` yields the same `iTime`/`iFrame` to two concurrent readers (inject a
   `now()` for determinism); `iFrame` advances once per driver tick, not per reader. Test.
2. `check` **and** `test` green for `graph-editor`; keep prior tests green.
3. **Visual ⚠:** two Effect preview panes animate **in sync** (same phase) by default;
   `iMouse` still responds per-pane to that pane's hover. Screenshot.

## Out of scope

The unsync **toggle UI** + its persistence (follow-on, Part 2 leaves the seam); a global
play/pause/restart transport (separate); syncing non-Effect previews (Cpu/Gpu don't animate on
`iTime` the same way).

## Handoff

→ Preview panes share one animation clock by default, so multi-pane inspection shows coherent
motion; the clock abstraction leaves room for a per-pane unsync toggle later.

**Phase 0 of `M-unified-preview-execution`.** This shared clock is the **single-loop clock** in
the target architecture (one graph execution per frame, panes as views, feedback). Build it as a
**graph-level shared source**, not pane-local — the later frame-graph GPU executor drives it.
Do not couple the clock to a single pane's render loop.
