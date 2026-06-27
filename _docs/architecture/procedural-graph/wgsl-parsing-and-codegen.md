# WGSL parsing & codegen — design record

**Status:** architecture decision · **Authority:** canonical for WGSL parsing,
codegen, linking, and self-describing-primitive loading in the
[Procedural Graph System](./README.md). **Scope:** `packages/compiler`,
`packages/procedural-wgsl`, linker adapters, primitive loaders.

> **For agents:** When a milestone brief, implementation plan, or stream doc
> touches WGSL parsing, AST usage, `@use-gpu/shader`, codegen shape, or the
> primitive loader, **read this document first**. Propose changes here before
> editing dependent docs (`graph-and-compiler.md`, `schema-and-primitives.md`,
> milestone briefs). Do not introduce a owned WGSL semantic AST into the compiler
> public surface without updating this record and its rationale.

---

## Decision (summary)

**The procedural graph compiler does not own a WGSL semantic AST.**

The typed **Graph IR** (`GraphDocument`, primitives, coordinate-space validation)
is the program representation. WGSL is an **output language**: the compiler emits
text, optionally validates it, and optionally hands it to a **linker adapter** that
may parse internally.

| Concern | Own a WGSL AST? | Approach |
|---------|-----------------|----------|
| Graph → WGSL (M5 codegen) | **No** | Emit WGSL source strings from `GraphSlice` + primitive schemas |
| Link / include / DCE (M6 linker) | **No ownership** | `ShaderLinker` interface; adapter may use `@use-gpu/shader` or `#include` expansion |
| Self-describing `.wgsl` primitives (M3) | **Signature extraction only** | `WgslSignatureReader` — fn headers, `use` imports, YAML frontmatter |
| Correctness gate | **No ownership** | `WgslValidator` — compile via WebGPU and/or naga in tests/CI |

---

## Context

Use.GPU ships a standalone package **`@use-gpu/shader`** with a Lezer-based WGSL
parser, symbol/shake tables, and a linker/tree-shaker. That is useful **behind an
internal adapter**, but it is not a semantic WGSL IR suitable as the compiler's
program representation:

- The parse result is a **Lezer concrete syntax tree** (`@lezer/common`.Tree), not
  typed AST nodes (`FnDecl`, `BinaryExpr`, …).
- Semantic structure for linking lives in **symbol and shake tables**
  (`getSymbolTable`, `getShakeTable`, `getDeclarations`).
- Grammar targets **WGSL 0.x (provisional)**; browser acceptance is validated
  separately.

Virtual Planet's differentiation is the **typed field graph** (ports, coordinate
spaces, multi-output slicing). Duplicating graph semantics inside a WGSL AST would
create two sources of truth.

---

## Architectural principle

```
Authoring → Graph IR (TypeScript) → validate / slice / codegen → WGSL text
                                                              ↓
                                                    link / validate (optional adapters)
                                                              ↓
                                                    WebGPU pipelines (runtime)
```

**Graph IR is authoritative for:**

- What runs (dependency slicing — M4)
- Type and space compatibility (M1 validation)
- Which outputs each consumer needs
- Primitive wiring (`WgslSourceRef.moduleId` + `entry`)

**WGSL text is authoritative only after emission** — for GPU compilation and for
human inspection in the editor / WebGPUToy.

---

## The three WGSL-touching jobs

### 1. Codegen (M5) — text emission, no parse step

`generateWgsl(slice, resolver)` maps each slice node → primitive → resolved module
source. Emit order is **dependencies-first, deduplicated** (post-order DFS over
module ids declared on resolved modules).

- Input: `GraphSlice`, `WgslModuleResolver`, primitive registry
- Output: `GeneratedWgsl { code, moduleIds }` — concatenated module sources, not a
  complete shader stage
- **No WGSL parse** in the compiler hot path

See [briefs/M5-codegen.md](./briefs/M5-codegen.md).

### 2. Shader linker (M6) — adapter-owned parsing

`ShaderLinker` assembles stage-specific shaders from generated/resolved functions:
dependency ordering, duplicate elimination, module composition, WGSL-level dead-code
elimination.

```ts
interface ShaderLinker {
	link(input: { entry: string; modules: Record<string, string> }): string;
}
```

- First implementation may mirror `fe/vite-wgsl.ts` recursive `#include` expansion
  (textual, no AST).
- Optional acceleration: **`@use-gpu/shader/wgsl`** behind the adapter (`loadModule`,
  `linkModule`, `linkBundle`, shake via symbol tables). The Lezer `Tree` stays an
  **implementation detail** of that adapter — never exported from
  `@virtual-planet/compiler`.
- The compiler **must not** depend on a specific linker implementation (same rule as
  in [graph-and-compiler.md](./graph-and-compiler.md)).

**Two levels of tree shaking** (unchanged):

1. **Graph-level** — M4 slicing removes unused branches before codegen.
2. **WGSL-level** — M6 linker removes unused helpers/imports from emitted text.

### 3. Primitive loader (M3) — signature inference, not semantic AST

Self-describing WGSL primitives combine:

- **Signature inference** (mechanical) — exported `fn` name(s), parameter names +
  WGSL types, return type, `use` / module dependency ids
- **YAML frontmatter** (semantic / UX) — category, units, widgets, ranges, docs,
  inspector grouping

```ts
/** Reads fn signatures and import deps from WGSL source — not a full semantic AST. */
interface WgslSignatureReader {
	readSignatures(source: string): WgslFnSignature[];
	readImports(source: string): string[]; // module ids from `use` directives
}

interface WgslFnSignature {
	name: string;
	parameters: { name: string; type: string }[];
	returnType: string;
}
```

Merge with parsed YAML → complete primitive schema equivalent to `definePrimitive`.
**Signature-derived types are authoritative for port wiring; YAML is authoritative
for editor/domain metadata** (widgets, sections — consumed by the shared form
generator per [parameter-and-form-schema.md](./parameter-and-form-schema.md)).

Prefer a **small in-repo signature extractor** (scoped grammar or careful scanning)
over coupling primitive registration to `@use-gpu/shader`'s provisional Lezer
grammar. Validate loaded modules via `WgslValidator`, not by trusting parse depth.

See [schema-and-primitives.md → Self-describing WGSL primitives](./schema-and-primitives.md#self-describing-wgsl-primitives).

---

## Validation (no owned AST)

```ts
interface WgslValidator {
	validate(source: string): Promise<{ ok: true } | { ok: false; message: string }>;
}
```

Implementations (swappable, not part of compiler public API unless brief says so):

- **WebGPU** — `device.createShaderModule` (reuse `wgslCompile.test.ts` harness
  where a device exists; skip in headless CI).
- **naga (WASM)** — spec-faithful front-end when static validation at scale is
  needed; keep behind `WgslValidator`, not in codegen.

Validation confirms emitted/linked WGSL is acceptable; it does not replace graph-level
type checking.

---

## Use.GPU / `@use-gpu/shader` — allowed usage

| Use | Allowed | Notes |
|-----|---------|-------|
| Reference architecture for composable WGSL functions | ✅ | Inspiration only for `procedural-wgsl` layout |
| M6 linker adapter implementation | ✅ | `@use-gpu/shader/wgsl` as dev/runtime dep of adapter or `fe/`, not `compiler` core unless brief explicitly adds it for M6 only |
| M3 signature reader | ⚠️ avoid as SoT | Symbol table may diverge from browser WGSL; prefer dedicated signature reader |
| Compiler IR / codegen target | ❌ | Graph IR remains the IR |
| Public export from `@virtual-planet/compiler` | ❌ | No Lezer `Tree`, `ParsedModule`, or linker types in compiler package API |

If M6 adds `@use-gpu/shader`, it lands in a **`packages/compiler/src/linker/use-gpu-adapter.ts`**
(or similar) behind `ShaderLinker`, with vitest gates on **linked output strings**,
not on AST shape.

---

## What we explicitly do not build

- A full in-repo WGSL semantic AST and visitor pipeline
- WGSL-as-IR for graph codegen or multi-output slicing
- Exposing third-party parse trees through `@virtual-planet/compiler` public exports
- Maintaining handwritten WGSL dependency lists on primitives (discovery is
  module-source-driven via resolver + optional signature reader)

---

## Package boundaries

| Package | WGSL role |
|---------|-----------|
| `@virtual-planet/graph` | IR, primitives, `WgslSourceRef`; no WGSL parse |
| `@virtual-planet/compiler` | slice, codegen (text), optional signature reader + linker **interfaces**; implementations per milestone brief |
| `@virtual-planet/procedural-wgsl` | `.wgsl` source files; stable module ids |
| `fe/` | `vite-wgsl.ts` include expansion (precursor to linker); GPU compile tests |

No WGSL AST types cross package boundaries. Strings and small signature structs only.

---

## Terminology

| Term | Meaning in this project |
|------|-------------------------|
| **Graph IR** | `GraphDocument` + validation — the program AST |
| **Signature inference** | Extracting fn headers and imports from WGSL text (M3) |
| **AST inference** (legacy phrasing in older docs) | Same as **signature inference** — not a full WGSL semantic AST |
| **Codegen** | Graph slice → ordered WGSL source strings (M5) |
| **Linker** | WGSL text → single shader string + DCE (M6) |
| **Lezer tree** | Concrete syntax tree inside `@use-gpu/shader`; linker adapter internals only |

When editing older docs, prefer **signature inference** over **WGSL AST** unless
referring specifically to a third-party parse tree inside an adapter.

---

## When to revisit this decision

Re-open this record (do not silently expand scope) if:

1. User-authored arbitrary WGSL nodes require spec-accurate type checking beyond
   signatures and graph validation.
2. `@use-gpu/shader`'s grammar repeatedly diverges from browser WGSL acceptance.
3. A linker requirement needs semantic transforms that string emission + shake
   cannot express (e.g. cross-function specialization with typed binding layout).
4. WebGPUToy third-party primitives need sandboxed static analysis at scale.

If revisiting, evaluate **naga (WASM)** or **Tint** behind `WgslValidator` /
optional `WgslSignatureReader` — still not as compiler IR unless this document is
updated with explicit rationale and milestone plan changes.

---

## Related docs

| Doc | Relationship |
|-----|--------------|
| [graph-and-compiler.md](./graph-and-compiler.md) | Stream overview; linker + loader summaries — defers here for parse/AST policy |
| [schema-and-primitives.md](./schema-and-primitives.md) | Self-describing WGSL format; signature + YAML merge |
| [parameter-and-form-schema.md](./parameter-and-form-schema.md) | Param UI, M3 YAML widgets, M9 inspector |
| [briefs/M5-codegen.md](./briefs/M5-codegen.md) | Pinned M5 contract (text codegen, no parse) |
| [execution-and-delegation.md](./execution-and-delegation.md) | Contract-first workflow; design ADRs inform brief authorship |

---

## Change log

| Date | Change |
|------|--------|
| 2026-06-24 | Initial record: no owned WGSL semantic AST; signature inference + linker adapters; Use.GPU scoped to optional M6 adapter |
