# Brief — Vector combine/append primitives (build larger vectors)

**Type:** std-library nodes · **Packages:** `@virtual-planet/procedural-wgsl` (WGSL modules),
`@virtual-planet/graph` (primitives) · **Depends on:** port defaults ✅ (`1f1bee4` — the
appended scalar's default) · **Design authority:** `primitive-library.md` · **Contract
author:** Opus · **Recommended executor:** Cursor.

## Goal

Add nodes that **combine smaller vectors + scalars into larger vectors** — e.g.
`vec3f, f32 → vec4f`. The vector library today has constructors (from scalars), component
extractors, and math ops, but no way to *append/concat* — so building a `vec4f` from a `vec3f`
plus one scalar means destructuring to four scalars. Fill that gap.

## Primitives

Follow the existing vector pattern (`procedural-wgsl/src/modules/vector/index.ts` WGSL +
`graph/src/primitives/vector/index.ts` registration). WGSL uses native vector construction
(`vec4<f32>(v, s)` etc.). Set:

| id | inputs | output | WGSL entry |
|----|--------|--------|-----------|
| `vector.combine.vec2f_f32` | `xy: vec2f`, `z: f32` | `vec3f` | `combineVec2fF32` → `vec3<f32>(xy, z)` |
| `vector.combine.vec3f_f32` | `xyz: vec3f`, `w: f32` | `vec4f` | `combineVec3fF32` → `vec4<f32>(xyz, w)` |
| `vector.combine.vec2f_f32_f32` | `xy: vec2f`, `z: f32`, `w: f32` | `vec4f` | `combineVec2fF32F32` → `vec4<f32>(xy, z, w)` |
| `vector.combine.vec2f_vec2f` | `xy: vec2f`, `zw: vec2f` | `vec4f` | `combineVec2fVec2f` → `vec4<f32>(xy, zw)` |

- **Port defaults double as "promote":** the appended scalar inputs carry defaults — **`z`
  default `0`, `w` default `1`** (homogeneous / opaque convention). So an unconnected `w` on
  `vector.combine.vec3f_f32` turns it into `vec3f → vec4f` promotion with `w = 1` — one node
  covers both "append a value" and "promote with default." (Uses the landed port-defaults
  mechanism; no new machinery.)
- **`evalCPU`** concatenates: `combineVec3fF32([x,y,z], w) → [x,y,z,w]`; unconnected scalar
  uses its port default.
- **Metadata:** `category: 'vector'`, `pure`, `deterministic`; `help`/`keywords`
  (`append`, `combine`, `concat`, `promote`, `homogeneous`). Register the WGSL modules in the
  vector module list and the primitives in the vector registration array.

## Gate

1. **graph:** each primitive registers; `evalCPU` concatenation is correct; an unconnected
   appended scalar resolves to its default (`combine.vec3f_f32` with `w` unconnected →
   `[x,y,z,1]`). Tests in `graph`.
2. **procedural-wgsl:** the new modules pass the module coverage + `use-deps` guards; entry
   names match the primitives' `wgsl.entry`. WGSL validity.
3. **codegen:** a graph using `vector.combine.vec3f_f32` emits `combineVec3fF32(v, w)` and
   compiles (headless assembly contains the call; device compile where available).
4. `check` **and** `test` green for both packages; keep all prior tests green.

## Out of scope

Swizzle nodes (`.xy`, `.xz`, arbitrary component remap) — a separate swizzle family; `f32 →
vecN` splat/broadcast; prepend variants (`f32, vec2f`) unless trivially added. Editor UX
beyond the nodes appearing in the palette/swap menu (they inherit both automatically).

## Handoff

→ Graphs can build `vec3f`/`vec4f` from vectors + scalars (and promote with defaults), closing
the constructor↔extractor round-trip. Feeds colour/position assembly (e.g. `rgb + a`,
`xy + z`) without four-way scalar destructuring.
