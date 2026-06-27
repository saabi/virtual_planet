# Brief — Harvest colour transforms from colorlab

**Type:** standard-library expansion · **Packages:** `@virtual-planet/procedural-wgsl`,
`@virtual-planet/graph` · **Depends on:** M3 ✅, procedural-wgsl ✅ · **Design
authority:** [primitive-library.md](../primitive-library.md),
[schema-and-primitives.md](../schema-and-primitives.md) · **Contract author:** Opus ·
**Recommended executor:** Cursor.

## Objective

Port the **per-pixel colour-space transforms** from the user's own
`/home/ushif/repos/colorlab/fe/src/lib/color/` into `procedural-wgsl` `color.*` modules +
graph primitives, growing the Colour palette (group `Effects`). colorlab is the user's repo
— **no external license** concern; still add a `source: colorlab` provenance note in each
module's frontmatter.

## Source (in `colorlab/fe/src/lib/color/`)

`spaces.ts` / `fundamentals.ts` / `transfer.ts` / `adapt.ts` / `interp.ts` and the matrices
(`SRGB2XYZ`, `RGB2LMS`, `LMS2RGB`, `XYZ2LMS2`, …). Port the **per-pixel** conversions:

| Primitive id | from colorlab | notes |
|--------------|---------------|-------|
| `color.srgbToXyz` / `color.xyzToSrgb` | `rgbToXyzM` / inverse + transfer | matrix + sRGB transfer |
| `color.xyzToLab` / `color.labToXyz` | `xyz2lab` / `lab2xyz` | CIELAB |
| `color.xyzToLuv` / `color.luvToXyz` | `xyz2luv` / `luv2xyz` | CIELUV |
| `color.lsrgbToOklab` / `color.oklabToLsrgb` | `lsrgb2oklab` / `oklab2lsrgb` | OKLab |
| `color.oklabToOklch` / `color.oklchToOklab` | (polar of oklab) | cylindrical |
| `color.srgbTransfer` / `color.srgbTransferInv` | `transfer.ts` | EOTF/OETF |
| `color.chromaticAdapt` | `adapt.ts` (Bradford/CAT) | white-point adaptation |
| `color.simulateCvd` | `simulateCvdSrgb` | colour-vision-deficiency sim |

Skip non-per-pixel code (gamut-boundary generation, diagram labels, MacLeod–Boynton diagram
helpers) — not WGSL primitives.

## Approach

1. For each: a `procedural-wgsl` module (WGSL body — port the matrix math + nonlinear funcs;
   the TS is the reference) + YAML frontmatter (id, entry, typed `vec3` in/out, `category:
   Colour`, `group: Effects`, `source: colorlab`). Register a graph primitive via the M3
   loader; provide `evalCPU` mirroring the colorlab TS (cheap — these are small vector math).
2. Keep the math identical to colorlab (parity); reuse its matrix constants verbatim.
3. Note: many form **swap families** (the space-conversion contract `vec3 → vec3`) — see
   [node-model-design-notes.md](../node-model-design-notes.md) §C; categorize so the editor
   can group them.

## Gate

1. Each primitive registered + resolvable (module source contains the expected `fn` + a
   `colorlab` provenance note).
2. `evalCPU` numeric parity tests vs the colorlab TS for a few known colours (e.g. sRGB
   white → XYZ D65; a mid-grey round-trips srgb→oklab→srgb within tolerance).
3. No id collisions with existing `color.*` (srgbToLinear/linearToSrgb/hsv2rgb).
4. `npm run check`/`test -w @virtual-planet/procedural-wgsl` + `-w @virtual-planet/graph` green.

## Out of scope

Gamut *mapping* / boundary generation (complex, not per-pixel — later if needed); the
colorlab UI; a colour-picker node. **Per-pixel conversions only.**

## Handoff

→ A rich, perceptually-correct colour toolkit (OKLab/OKLCH especially) for effects and
material authoring — each a schema-driven `color.*` primitive, swap-family-grouped.
