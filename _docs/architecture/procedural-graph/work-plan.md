# Prioritized work plan

**Status:** prioritized backlog · **Date:** 2026-06-29 (Opus) · **Goal (user-set):** a
**fully functional app pipeline** first — the editor as a complete, honest authoring tool
— then engine, library, and PoC breadth. Orders every pending item from
[pending_issues.md](../../pending_issues.md), the pinned briefs, and the audit.

---

## Tier 1 — Fully functional editor pipeline (DO FIRST)

The bar: open the editor → build a graph from **real nodes** → **see each node's real
WGSL** → **watch the full compiled WGSL** → **incomplete/invalid graphs are flagged** →
preview renders → **edits reliably update everything**.

| # | Task | Brief | State |
|---|------|-------|-------|
| 1 | **Final compiled-WGSL view** — read-only panel showing the whole graph's compiled output WGSL per consumer/output (the "watch the final shader" capability) | [briefs/M-compiled-wgsl-view.md](./briefs/M-compiled-wgsl-view.md) | 📌 new |
| 2 | **Flag incomplete / invalid graphs** — validation for unconnected required inputs, no-consumer / dangling nodes, unresolved primitives, plus existing type/space/resource mismatches; surfaced in `ValidationPanel` + node/edge highlight | [briefs/M-graph-validation-flagging.md](./briefs/M-graph-validation-flagging.md) | 📌 new |
| 3 | **Real code for every node type** + **reliable recompile on edit** — CodeView shows real WGSL for primitives ✅, **groups** (generated function), and **pipeline nodes** (geometry/buffer/stage/target); code/param/rewire/load edits reliably recompile → re-render preview **and** the compiled-WGSL view | [briefs/M-editor-recompile-and-node-source.md](./briefs/M-editor-recompile-and-node-source.md) | 📌 new |
| 4 | **params-as-inputs in the editor + build** — promotable params appear as input ports; the form shows connected-vs-literal; codegen/`evalCPU` use the wired upstream (graph-core helpers exist) | [briefs/M-params-as-inputs.md](./briefs/M-params-as-inputs.md) (+ follow-on) | 🔶 graph-core done; editor+codegen pending |

**Outcome:** the editor is trustworthy end-to-end — what you see (per-node code, final
WGSL, validity) is what runs.

## Tier 2 — Engine completeness

| Task | Brief |
|------|-------|
| Frame-graph **GPU executor** (multi-pass ordering, ping-pong feedback, transient pool) — unblocks multibuffer / render-to-texture | [M-pass-graph-executor.md](./briefs/M-pass-graph-executor.md) (pure core done) |
| **Resource GPU binds** (image/mesh/audio as real shader inputs) — ShaderToy `iChannel` textures | audit |
| **Graph-driven mesh-gen consumer** (replace hardcoded `buildSurfaceMesh`) | [M-mesh-gen-consumer.md](./briefs/M-mesh-gen-consumer.md) |
| **list container nodes** (`flow.forEach`/`reduce`/`map`) for dynamic collections (N lights) | node-model-design-notes §A |
| Editor UX: **node-swap** ("Change operation ▸"), **groups** (save/collapse/zone), **help tooltips**, **collapsible palette** | node-model-design-notes §C/§E; editor.md |

## Tier 3 — Standard-library breadth

| Task | Brief |
|------|-------|
| **`transform.*` family** (scale/rotate/translate/spherify/displace/twist) — also fixes `geometry.plane` orientation/dimensions + decomposes cube-sphere | node-model-design-notes §B |
| **colorlab remainder** (OKLab/OKLCH, CVD, chromatic adapt, gamut) | [M-colorlab-harvest.md](./briefs/M-colorlab-harvest.md) (slice A done) |
| **vegetation as nodes** (densityField/peakDetect/prominence/coverageMask) | primitive-library |
| **terrain-analysis primitives** (slope/altitude/curvature/beach/ridge/erosion) | primitive-library |
| remaining math/sdf/colour LHF (incl. `math.normalize` for spherify) | primitive-library |

## Tier 4 — ShaderToy / PoC / roadmap

| Task | Brief |
|------|-------|
| **S0.5 Game of Life** multibuffer (after the frame-graph executor) | [M-shadertoy-poc.md](./briefs/M-shadertoy-poc.md) |
| **Planet PoC P0–P5** (instance input → tessellator composition → shaping parity → route parity) | [planet-pipeline-poc-feasibility.md](./planet-pipeline-poc-feasibility.md) |
| **M13** planet migration — **GATED** (renderer-unification); **M14** docs/session; **M15** MCP; **M16** embed; **M17** WebGPUToy | [implementation-plan.md](./implementation-plan.md) |

---

## Execution notes

- **Tier 1 is the active focus.** Items 1–3 are mostly editor/graph-editor (parallel-safe
  among themselves if owned by file: compiled-view panel, validation, recompile/source);
  item 4 spans graph/compiler/editor.
- **Visual gates need a human eyeball** — headless green ≠ renders. WGSL-emitting changes
  must pass `check` + `test` + WGSL validity (the `use-deps` guard / device compile).
- Briefs are the contract; gate = done. Route Tier-1 to agents serially or by disjoint
  files; Opus pins contracts + reviews.
