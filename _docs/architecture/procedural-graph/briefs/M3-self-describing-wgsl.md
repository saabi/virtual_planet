# Brief — M3: Self-describing WGSL primitives

**Milestone:** M3 ([implementation-plan.md](../implementation-plan.md)) ·
**Packages:** `@virtual-planet/schema`, `@virtual-planet/graph`,
`@virtual-planet/compiler` ·
**Depends on:** M2 ✅ ·
**Design authority:**
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md),
[parameter-and-form-schema.md](../parameter-and-form-schema.md) ·
**Stream docs:** [schema-and-primitives.md](../schema-and-primitives.md),
[graph-and-compiler.md](../graph-and-compiler.md) ·
**Contract author:** Codex · **Recommended executor:** Codex.

## Objective

Load a reusable WGSL function module whose `/*--- ... ---*/` YAML frontmatter
describes its semantics and editor metadata. Infer mechanical port types from WGSL
function signatures, merge the two sources into the same `NodePrimitive` shape used
by hand-written registrations, and discover stable module dependencies.

This is a **scoped signature reader**, not a WGSL semantic parser. Graph IR remains
the program representation and no parse tree enters the public API.

## Files

- `packages/graph/src/primitive.ts` — optional metadata contracts *(update)*
- `packages/graph/package.json` — schema workspace dependency *(update)*
- `packages/graph/src/primitives/{clamp,perlin3d,remap,smoothstep}.ts` — migrate
  primitive params to TypeBox object schemas *(update)*
- `packages/schema/src/schema.ts` — section/scale-behavior annotations *(update)*
- `packages/schema/src/schema.test.ts` — annotation/introspection gate *(update)*
- `packages/compiler/package.json` — direct `yaml` dependency *(update)*
- `package-lock.json` — dependency lock update *(update)*
- `packages/compiler/src/primitiveLoader.ts` — reader + frontmatter merge *(new)*
- `packages/compiler/src/primitiveLoader.test.ts` — acceptance gate *(new)*
- `packages/compiler/src/codegen.test.ts` — migrate test primitives to param schemas
  *(update)*
- `packages/compiler/src/index.ts` — re-export loader *(update)*

No `procedural-wgsl`, renderer, editor, linker, or codegen implementation files.
Use `yaml` `^2.4.2`; do not add a WGSL parser dependency.

## Parameter-schema convergence

The parameter/form ADR supersedes M2's staging `ParamSpec[]`. M3 performs the
one-time convergence rather than adding UI metadata to that staging type.

In `@virtual-planet/schema`, add and export:

```ts
export const X_SECTION = 'x-section';
export const X_SECTIONS = 'x-sections';
export const X_SCALE_BEHAVIOR = 'x-scale-behavior';

export type ScaleBehavior = 'freq' | 'ratioR' | 'R_ref' | 'pure' | 'flag' | 'length';
export type Unit = 'none' | 'm' | 'km' | 'kg' | 's' | 'rad' | 'deg' | '1/m';

export interface ParamSectionMeta {
	id: string;
	label?: string;
	order?: number;
	collapsed?: boolean;
	parent?: string;
}

export function sectionsOf(schema: TSchema): ParamSectionMeta[];
```

Extend `SchemaAnnotations` / `annotationsOf()` with optional `section` and
`scaleBehavior`. `sectionsOf()` reads `x-sections` from an object schema, returns a
defensive copy, and returns `[]` for absent/invalid data. Existing factories and
scene schemas remain compatible.

In `packages/graph/src/primitive.ts`, import `TSchema` from
`@virtual-planet/schema`, remove `ParamSpec`, and change:

```ts
export interface NodePrimitive {
	// existing fields unchanged
	params: TSchema; // must be a TypeBox object schema
	metadata?: PrimitiveMetadata;
}
```

`registerPrimitive` continues to accept `NodePrimitive`; M3 does not add registry
side effects or runtime validation there. All existing standard/test primitives
must migrate from `params: [...]` to `params: Type.Object({...})`. Empty params use
`Type.Object({})`. `CpuEvalContext.params` remains the runtime value bag.

This is intentionally a breaking internal migration. Do **not** retain a parallel
`ParamSpec[]`, add `ParamSpec.metadata`, or introduce another inspector schema.

## Graph metadata additions

Add these public types in `packages/graph/src/primitive.ts`:

```ts
export interface PrimitiveMetadata {
	description?: string;
	pure?: boolean;
	deterministic?: boolean;
	color?: string;
	icon?: string;
	keywords?: string[];
}

export interface PortMetadata {
	wgslType?: string;
	description?: string;
	semantic?: string;
	unit?: string;
	range?: readonly [number, number];
}

export interface WgslArgumentBinding {
	name: string;
	source: 'input' | 'param';
}
```

Extend the port/WGSL-reference types:

```ts
export interface PortSpec {
	// existing fields unchanged
	metadata?: PortMetadata;
}

export interface WgslSourceRef {
	// existing fields unchanged
	arguments?: WgslArgumentBinding[];
}
```

Primitive presentation metadata remains plain serializable data. Form metadata,
defaults, constraints, widgets, and sections belong only to the TypeBox parameter
schema.

## Frontmatter grammar

The source may contain at most one YAML frontmatter block, and
`loadWgslPrimitive` requires exactly one:

```wgsl
/*---
id: noise.perlin3d
entry: perlin3d
category: Noise
description: Classic Perlin noise over a 3D position.
pure: true
deterministic: true
color: "#5d8cff"
icon: perlin
keywords: [noise, fbm]

sections:
  - { id: frequency, label: Frequency, order: 10, collapsed: false }

inputs:
  position:
    semantic: body-direction
    space: body_dir
    unit: none

params:
  scale:
    unit: 1/m
    widget: slider
    min: 0.0001
    max: 1
    default: 0.002
    section: frequency
    scaleBehavior: freq

outputs:
  value:
    semantic: scalar-field
    range: [0, 1]
---*/
// @use noise.hash
fn perlin3d(position: vec3<f32>, scale: f32) -> f32 {
	// ...
}
```

Required top-level keys:

- `id`: non-empty string
- `category`: non-empty string
- `outputs`: mapping with exactly one output name

Optional top-level keys:

- `entry`: function name; may be omitted only when the source contains one function
- `description`, `pure`, `deterministic`, `color`, `icon`, `keywords`, `sections`
- `inputs`: mapping of host/edge-supplied signature parameters
- `params`: mapping of authored per-node signature parameters

Unknown top-level keys and wrong value types throw `Error`. YAML aliases are
disabled. The decoded value must be a plain mapping/array/scalar tree.

Every selected-signature parameter must appear exactly once in either `inputs` or
`params`; unknown, missing, or duplicate classifications throw. The single output
annotation supplies the graph output name. M3 does not support multiple/struct
return values.

Input/output annotation keys are limited to `description`, `semantic`, `space`,
`unit`, and `range`. `space` must be a valid `CoordinateSpace` and is assigned to
`PortSpec.space`; it is not copied into `PortMetadata`.

Param annotation keys are limited to `description`, `unit`, `widget`, `min`, `max`,
`default`, `section`, and `scaleBehavior`. `default` is required and must match the
inferred scalar type. The loader constructs a TypeBox property schema carrying the
same JSON-Schema constraints and `x-*` annotations used by
`@virtual-planet/schema`; the enclosing `Type.Object` carries `x-sections`.
Supported units for M3 are `none`, `m`, `km`, `kg`, `s`, `rad`, `deg`, and `1/m`.
`scaleBehavior` must be a `ScaleBehavior`.

Unknown keys or invalid values throw. Section IDs are unique; field section and
section parent references must resolve when `sections` is present.

## Dependency directive

WGSL has no native import syntax. M3 uses a WGSL-compatible line-comment directive:

```wgsl
// @use noise.hash
// @use math.remap
```

Module IDs match `[A-Za-z0-9][A-Za-z0-9._/-]*`. Preserve first-seen order and
deduplicate repeated IDs. Ignore `@use` text inside block comments. A line beginning
with `// @use` but containing an invalid or missing ID throws.

This is discovery only. M3 does not modify `WgslModule.dependencies`; a later
procedural-WGSL resolver can populate that field from loader output.

## Compiler public surface

In `packages/compiler/src/primitiveLoader.ts`:

```ts
import type { NodePrimitive } from '@virtual-planet/graph';

export interface WgslFnParameter {
	name: string;
	type: string;
}

export interface WgslFnSignature {
	name: string;
	parameters: WgslFnParameter[];
	returnType: string;
}

export interface WgslSignatureReader {
	readSignatures(source: string): WgslFnSignature[];
	readImports(source: string): string[];
}

export const textWgslSignatureReader: WgslSignatureReader;

export interface LoadWgslPrimitiveInput {
	moduleId: string;
	source: string;
	reader?: WgslSignatureReader;
}

export interface LoadedWgslPrimitive {
	primitive: NodePrimitive;
	imports: string[];
}

export function loadWgslPrimitive(input: LoadWgslPrimitiveInput): LoadedWgslPrimitive;
```

`loadWgslPrimitive` is pure and does not call `registerPrimitive`. Callers choose
when and where registration occurs.

## Signature-reader contract

The in-repo reader supports the deliberately bounded grammar required by M3:

- module-level `fn name(param: type, ...) -> returnType {`
- signatures may span lines and contain arbitrary whitespace
- parameter and return types may contain balanced angle brackets, such as
  `vec3<f32>` or `array<vec4<f32>, 4>`
- line comments and WGSL nested `/* ... */` comments are ignored
- text resembling `fn` inside comments is ignored
- duplicate function names, unterminated comments/signatures, unbalanced delimiters,
  missing parameter types, or missing return types throw `Error`

Attributes on parameters/returns, generic functions, pointer/resource types,
struct/tuple returns, and function declarations without bodies are out of scope.
The reader returns trimmed WGSL type strings but performs no semantic validation.

## Authoritative type mapping and merge

Signature types, never YAML, determine graph input/output and parameter types:

| WGSL | Input/output port | Authored param |
|------|-------------------|----------------|
| `f32` | `f32` | `Type.Number` |
| `i32` | unsupported | `Type.Integer` |
| `bool` | `bool` | `Type.Boolean` |
| `vec2<f32>` | `vec2f` | unsupported |
| `vec3<f32>` | `vec3f` | unsupported |
| `vec4<f32>` | `vec4f` | unsupported |

Whitespace inside vector types is accepted and normalized for matching. Any other
selected-entry classification or return type throws
`Error("Unsupported WGSL port type: ...")`. Resource handles and integer ports are
not introduced by M3.

The selected signature becomes:

- one `PortSpec` input per `inputs` classification
- one `PortSpec` output named by the sole `outputs` frontmatter key
- optional `PortSpec.space` values from YAML, defaulting to `none` by omission
- `params: Type.Object({...})`, with properties inserted in signature order
- `wgsl: { moduleId, entry, arguments }`, where `arguments` preserves full signature
  order and records whether each argument comes from an input or authored param
- `category` and optional `metadata` from frontmatter
- each port's `metadata.wgslType` from its exact trimmed signature type, merged with
  its YAML field metadata

Frontmatter cannot override inferred type, parameter order, entry name, or module
ID. Param UI metadata exists only on the TypeBox property schema. Omit empty
presentation/port metadata objects so the loaded primitive deep-equals a
hand-written primitive using the same schema factories and optional fields.

## Acceptance gate

`primitiveLoader.test.ts` must prove:

1. A multiline WGSL source using the example shape loads to the same
   `NodePrimitive` object as an explicitly hand-written expected object.
2. Input/param classification, WGSL argument order, and exact `wgslType` metadata
   are preserved.
3. `// @use` IDs are ordered and deduplicated.
4. A custom `WgslSignatureReader` can be injected.
5. A single function may omit `entry`; multiple functions require it.
6. Function-like text and `@use` text inside comments are ignored.
7. YAML cannot override mechanical types; an unsupported WGSL type throws.
8. The merged param object schema exposes default/extent/widget/unit/section and
   scale-behavior through `@virtual-planet/schema` introspection and validates the
   expected value bag.
9. Malformed frontmatter, unknown keys, missing/duplicate argument
   classifications, wrong param defaults, invalid section references, and invalid
   dependency directives throw.
10. Existing schema, graph, and compiler tests remain green after all hand-written
    primitives migrate from `ParamSpec[]`.

Run:

```sh
npm run check -w @virtual-planet/graph
npm test -w @virtual-planet/graph
npm run check -w @virtual-planet/schema
npm test -w @virtual-planet/schema
npm run check -w @virtual-planet/compiler
npm test -w @virtual-planet/compiler
```

## Out of scope

No full WGSL AST, Lezer/Use.GPU parser, WGSL validation/device compilation, automatic
registration, file-system resolver, source rewriting, codegen/linker changes,
multi-output structs, attributes, resource/pointer/integer ports, vector-valued
authored params, YAML-authored mechanical types, CPU evaluator generation, editor
UI, `paramEditorSchema` changes, raw uniform layouts/editors, or procedural
standard-library migration.

## Done when

All three touched packages pass check/test gates, existing primitive definitions
use TypeBox param object schemas, the loader output equals the hand-written
primitive shape, the scoped parser rejects malformed/unsupported input
deterministically, no parser tree is exported, and the full workspace tests remain
green.

## Handoff

→ **M9 — standalone editor contract** · architect pins the minimum vertical slice
using the completed graph/compiler/runtime surfaces, then implementation proceeds
behind the swappable graph-canvas adapter. M3 finishes the remaining compiler-side
prerequisite for that integration.
