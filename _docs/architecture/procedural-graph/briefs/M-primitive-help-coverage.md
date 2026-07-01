# Brief — Frontmatter-based help for every primitive (close the 55% gap)

**Type:** std-library + editor UX (follow-on to `M-editor-help-tooltips`) · **Packages:**
`@virtual-planet/graph` (backfill `help`/`usage` metadata across primitives),
`@virtual-planet/graph-editor` (`primitiveSources.ts` frontmatter synthesis,
`nodeInspectorHelp.ts` fallback), `@virtual-planet/compiler` (no change — frontmatter parsing
already supports `help`/`usage`) · **Depends on:** `M-editor-help-tooltips.md` ✅ (`5a17295`)
· **Design authority:** `node-model-design-notes.md` §C · **Contract author:** Opus ·
**Recommended executor:** Cursor (phase it — see Part 3).

## Problem (audited)

`5a17295` wired the inspector to show `metadata.help` (falling back to `description`), but only
added `help` text to `min`/`max` (plus a handful of pipeline primitives — 9 total). Audited the
full registry: **112 primitives, 9 with `help`, 47 with only `description`, 62 (55%) resolve to
a completely blank tooltip** — every `noise.*`, `math.*` (except the SDF-alias pair), `color.*`,
`terrain.*`, `surface.*`, `sdf.circle/box/segment`, and the `host.*`/`procedural.*` nodes.

Two mechanism gaps compound this:
1. **Authoring is inconsistent.** WGSL-frontmatter-loaded primitives (`primitiveLoader.ts`)
   already parse `help:`/`usage:` from the comment block into `metadata.help`/`usage` (lines
   ~521–531) — that path works today. But most primitives are **TS object literals**
   (`packages/graph/src/primitives/**`) with a bare `metadata: { help: '...' }` field, disconnected
   from any visible "frontmatter."
2. **The synthesized frontmatter doesn't show it.** `primitiveSources.ts` `formatBuiltinSource`
   (the block CodeView displays for TS-authored primitives) emits `id`/`entry`/`category`/
   `description`/`inputs`/`params`/`outputs` — **it omits `help`/`usage` even when set.** So the
   one place a user reads a primitive's "frontmatter" doesn't show the help text driving its
   own inspector tooltip. Two authoring paths, one of which is invisible.

## Fix

### Part 1 — Unify: frontmatter is the single displayed source (`graph-editor`)

`formatBuiltinSource` (`primitiveSources.ts`): add `help:`/`usage:` lines (quoted, like
`description`) to the synthesized frontmatter block when present on `metadata`. Now the CodeView
frontmatter for **every** primitive (WGSL-loaded or TS-authored) shows the same fields that
drive the inspector — one visible source, not two paths.

### Part 2 — Guaranteed non-empty fallback (`graph-editor`)

`resolveNodeInspectorHelp` (`nodeInspectorHelp.ts`) currently returns `''` when both `help` and
`description` are absent. Add a **last-resort generated summary** so no primitive is ever
blank: `${category} primitive · ${inputTypes.join(', ') || 'no inputs'} → ${outputTypes.join(', ')}`
(e.g. "noise primitive · vec2f → f32"). Precedence: `help` > `description` > generated. This is
a mechanical safety net, not a substitute for Part 3's real prose.

> **Guard test (anti-regression):** assert every primitive returned by `listPrimitives()`
> resolves a **non-empty** `resolveNodeInspectorHelp(...).summary`. Mirrors the no-stub-guard
> discipline elsewhere in this project — a primitive registered without any doc text becomes a
> test failure, not a silent blank tooltip.

### Part 3 — Backfill real `help` text, by category (phased, separate sub-passes)

Author real one-line `help` (+ `usage` where a wiring hint helps) for the 62 blank primitives,
**grouped by category** so each pass is small and reviewable — do not attempt all 62 in one
diff:
- `noise.*` (11): perlin2d/3d, simplex, worley/worley2d, fbm, ridgedFbm, value2d, voronoi2d,
  blue2d, perlin2dDeriv.
- `math.*` (12): remap, add/subtract/multiply/divide, negate, mix, pow, clamp, smoothstep,
  bias, gain, abs.
- `color.*` (14): srgb/linear conversions, hsv2rgb, Lab/Luv/XYZ/Oklab chain.
- `terrain.*` + `surface.*` + `material.*` (12): domainWarp, voronoi, detailFbm, heightRemap,
  fineTextureNoise, polarTerm, biomeMaterial, normalEstimator, worldNormal, selfShadow,
  cubeSphere/plane/cubeFaceDir, pbrLighting.
- `sdf.circle/box/segment`, `effect.cosinePalette`, `host.*`/`procedural.*` (remaining ~13).

Each sub-pass: pick the category, write a genuinely useful one-liner per primitive (what it
computes / expects — not a restatement of the id), run the Part 2 guard test to confirm the
category's blanks are gone, `check`+`test` green.

## Gate

1. **graph-editor:** guard test — zero primitives resolve to an empty inspector summary (Part 2
   makes this pass immediately via the generated fallback; each Part 3 sub-pass replaces
   generated text with authored text for its category, verifiable by a per-category assertion).
2. **graph-editor:** `formatBuiltinSource` includes `help:`/`usage:` in the synthesized
   frontmatter for a primitive that sets them (unit test).
3. `check` **and** `test` green for `graph` (as categories are backfilled) and `graph-editor`;
   keep all prior tests green.
4. **Visual ⚠:** open the inspector/CodeView for a previously-blank primitive (e.g.
   `noise.worley2d`) — shows real help text in both the inspector and the CodeView frontmatter
   block, not a generated placeholder (once its category's Part 3 sub-pass lands).

## Out of scope

Rich/example-runnable `usage` bodies (a short hint string is enough); moving TS-authored
primitives to literal WGSL-frontmatter files (out of scope — keep the TS-object authoring
model, just synthesize its frontmatter completely); auditing metadata fields other than
`help`/`usage`/`description`.

## Handoff

→ One authoring convention (`help`/`usage` in frontmatter, real or synthesized) drives both the
CodeView display and the inspector tooltip; a guard test guarantees no primitive is ever blank;
the 62-primitive backfill closes out category by category.
