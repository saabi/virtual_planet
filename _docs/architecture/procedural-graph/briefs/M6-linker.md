# Brief — M6: ShaderLinker + WGSL-level tree shaking

**Milestone:** M6 ([implementation-plan.md](../implementation-plan.md)) ·
**Package:** `@virtual-planet/compiler` · **Depends on:** M5 ✅ ·
**Design ADR (authoritative):**
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md) — §2 (shader linker)
and the Use.GPU usage table. **Contract author:** Opus · **Recommended executor:**
Cursor.

## Objective

Assemble a single shader string from a set of WGSL function modules, **keeping only
what the entry reaches** (WGSL-level dead-code elimination), with duplicates removed
and callees emitted before callers. This is the second of the two tree-shaking levels
(graph-level slicing is M4).

## ADR conformance (do not deviate)

- The linker is **text-based — no owned WGSL semantic AST**, and **exports no parse
  trees** from `@virtual-planet/compiler` (ADR §"Use.GPU usage", §"Package
  boundaries").
- Public surface is exactly the ADR's interface:
  ```ts
  interface ShaderLinker { link(input: { entry: string; modules: Record<string, string> }): string }
  ```
- The gate asserts on **linked output strings**, never on AST shape.
- `@use-gpu/shader` is **out of scope here** — the optional adapter
  (`src/linker/use-gpu-adapter.ts`) is a later, separate task and must not be added in
  M6. If you ever do, it lands behind `ShaderLinker` with string-level gates (ADR).

## Files

- `packages/compiler/src/linker.ts` — `ShaderLinker` interface + default `textLinker` *(new)*
- `packages/compiler/src/index.ts` — re-export `linker.ts` *(update; keep prior exports)*
- `packages/compiler/src/linker.test.ts` — the gate *(new)*

No new dependencies.

## Public surface (`linker.ts`)

```ts
export interface ShaderLinker {
	/** `entry` is the id of the root module in `modules`; returns one assembled WGSL string. */
	link(input: { entry: string; modules: Record<string, string> }): string;
}

/** Default text-based linker: reachability from the entry, dead modules dropped, callees first, deduped. */
export const textLinker: ShaderLinker;
```

## Algorithm (textual, no AST)

Each module source contains one or more `fn NAME(...) ...` definitions. Link as:

1. **Index defined functions.** Scan every module source for `fn\s+(\w+)\s*\(` to build
   `functionName → moduleId`. (Signature-level scanning per ADR §3 — not a semantic AST.)
2. **Reachability from `entry`.** If `entry` is not a key of `modules`, **throw**
   `Error(\`Unknown entry module: ${entry}\`)`. Starting at the entry module, scan its
   source for called identifiers (`(\w+)\s*\(`), keep those that are known defined
   function names, map to their modules, and recurse — with a `visited` set
   (dedup + cycle-safe). This yields the set of **reachable** modules.
3. **Drop unreachable** modules (WGSL-level DCE).
4. **Emit callees-first.** Post-order DFS over the reachable set (a module is emitted
   after the modules it calls), so every function is declared before use — WGSL has no
   forward function references. Dedup so each module appears once.
5. Join the reachable module sources with `"\n\n"` → the returned string.

This is a deliberately simple first implementation (textual reference scanning); the
ADR allows precision to improve later or via the optional Use.GPU adapter. It must not
introduce an AST or any third-party parse-tree types into the public surface.

## The gate (`linker.test.ts`) — must pass

```ts
import { describe, expect, it } from 'vitest';
import { textLinker } from './linker.js';

const modules: Record<string, string> = {
	'util.used': 'fn used() -> f32 { return 1.0; }',
	'util.unused': 'fn unused() -> f32 { return 9.0; }',
	'main': 'fn main_fn() -> f32 { return used(); }',
};

describe('@virtual-planet/compiler textLinker', () => {
	it('drops helpers the entry does not reach (WGSL-level DCE)', () => {
		const out = textLinker.link({ entry: 'main', modules });
		expect(out).toContain('fn main_fn()');
		expect(out).toContain('fn used()');
		expect(out).not.toContain('fn unused()');
	});

	it('emits callees before callers', () => {
		const out = textLinker.link({ entry: 'main', modules });
		expect(out.indexOf('fn used()')).toBeLessThan(out.indexOf('fn main_fn()'));
	});

	it('deduplicates a shared helper', () => {
		const m: Record<string, string> = {
			'h': 'fn h() -> f32 { return 1.0; }',
			'a': 'fn a() -> f32 { return h(); }',
			'main': 'fn main_fn() -> f32 { return a() + h(); }',
		};
		const out = textLinker.link({ entry: 'main', modules: m });
		expect(out.match(/fn h\(\)/g)).toHaveLength(1);
	});

	it('throws on an unknown entry module', () => {
		expect(() => textLinker.link({ entry: 'nope', modules })).toThrow();
	});
});
```

## Out of scope

No `@use-gpu/shader` adapter (separate later task), no semantic AST, no naga/WebGPU
validation (that's a `WgslValidator`, ADR §Validation), no slice→codegen→link compile
driver (later), no exported parse-tree types. **No new public exports beyond the two
listed.**

## Done when

`npm run check -w @virtual-planet/compiler` and `npm test -w @virtual-planet/compiler`
are green (M4 + M5 tests stay green), and the public surface matches this brief and the
ADR interface.

## Handoff

→ **M7 — CPU runtime services** (`runtime-cpu`: camera frustum, pointer→world ray) ·
executor: Opus pins the small service contract, then Cursor · why: Stage B (the
compiler core — slice → codegen → link) is complete; the next critical-path step toward
the first usable editor (M9) is the generic CPU runtime. (M3 — self-describing WGSL
loader, governed by the ADR §3 `WgslSignatureReader` — is also unblocked and can be
interleaved.)
