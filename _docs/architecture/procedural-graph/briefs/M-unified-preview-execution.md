# Brief — Unified preview execution (one graph loop; panes are views)

**Type:** architecture direction (phased; near-term) · **Packages:**
`@virtual-planet/runtime-webgpu` (frame-graph GPU executor), `@virtual-planet/graph-editor`
(preview integration) · **Depends on / vehicle:** `M-pass-graph-executor.md` (frame-graph
core landed; GPU executor pending), `M-shadertoy-poc.md` (feedback/S0.5) · **Design
authority:** [pipeline-as-graph.md](../pipeline-as-graph.md),
[inputs-cpu-and-resources.md](../inputs-cpu-and-resources.md) · **Contract author:** Opus.

## The direction

Today each preview pane runs its **own** shader + render loop + clock (independent
`EffectPreviewPanel` instances). That was fine for one output, but it's the wrong end state.
The target architecture:

- **One execution per frame.** A single loop runs the **whole graph** each frame, evaluating
  **all live outputs / render targets** together, with **shared uniforms** (`iTime`/`iFrame`,
  and the host inputs) — by default.
- **Preview panes are views**, not executions. A pane selects **which output texture** to
  display; it does not compile or drive its own shader. N panes = N views of the *same* frame.
- **Feedback is the reason.** An output at frame *K* can feed back as an **input at frame
  *K+1*** (ping-pong / multibuffer, à la ShaderToy Buffer A–D). That is only correct if every
  output renders in the **same** frame under **one** clock and **one** loop — independent
  per-pane loops would read stale/mismatched frames.
- **Single loop + shared uniforms are the default;** per-pane unsync / independent loops are an
  explicit **opt-out**, not the norm.

This is exactly what the frame-graph GPU executor (`M-pass-graph-executor`) already models —
"run all targets each frame, previous-frame feedback, present a selected target." The preview
becomes: **one executor instance per graph**; each pane presents a chosen target.

## Phasing

0. **Shared clock (interim, `M-shared-preview-clock`)** — panes still render independently but
   sample one `iTime`/`iFrame`. Its shared clock **becomes** the single-loop clock (don't build
   it as pane-local). ✅ enables sync now.
1. **Frame-graph GPU executor (`M-pass-graph-executor`, GPU half)** — one executor runs all
   targets per frame with feedback; presents a selected target.
2. **Preview panes → views** — replace per-pane `EffectPreviewPanel` shader/loop with a pane
   that displays a target texture from the single executor (pick target by the pane's selected
   buffer). Drop per-pane clocks/loops.
3. **Feedback nodes** — `buffer.persist` (and friends) as real ping-pong resources; S0.5 Game
   of Life proves it.
4. **Per-pane unsync (opt-in)** — the earlier seam: a pane may run its own clock/execution when
   the user asks.

## Guardrail (applies now)

Do **not** add more per-pane *independent-render* infrastructure (separate devices, separate
compile paths, per-pane feedback state) — it fights this convergence. New preview work should
assume a single execution with panes as views. Shared uniforms/clock = default.

## Gate (per phase, when routed)

Phase 1/2 land under `M-pass-graph-executor` + a preview-integration slice; the **acceptance
signal** for the direction is: a two-output graph where **output B reads output A's previous
frame** animates correctly across two panes (both showing the same synced frame), driven by one
loop. Device-gated visual + headless pass-order/feedback tests (frame-graph core already has
them).

## Handoff

→ Records the preview-execution target: one graph loop, shared uniforms, panes as views, feedback
by default. Sequences `M-shared-preview-clock` (now) → `M-pass-graph-executor` GPU executor →
preview-as-views → feedback. Keeps interim work from painting us into per-pane-execution corners.
