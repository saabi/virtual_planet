# Brief — M5: WGSL function generation + module resolver

**Milestone:** M5 ([implementation-plan.md](../implementation-plan.md)) ·
**Package:** `@virtual-planet/compiler` · **Depends on:** M1 ✅, M2 ✅, M4 ✅ ·
**Stream doc:** [graph-and-compiler.md](../graph-and-compiler.md) (WGSL module
resolution + function generation) · **Design ADR:**
[wgsl-parsing-and-codegen.md](../wgsl-parsing-and-codegen.md) (no owned WGSL AST;
codegen emits text) · **Contract author:** Opus · **Recommended
executor:** Cursor.

## Objective

Turn a `GraphSlice` (from M4) into a **WGSL string containing exactly the function
modules that slice needs**, resolved by **stable module id** and emitted in
**dependency order** with duplicates removed. This is generation + resolution only —
stage assembly and WGSL-level dead-code elimination are M6 (the linker).

## Design (pinned)

- A primitive already declares `wgsl: { moduleId, entry }` (M2's `WgslSourceRef`).
  Codegen maps each slice node → its primitive (via `getPrimitive`) → its `moduleId`.
- Modules are resolved through a **`WgslModuleResolver`** abstraction (so the source
  of WGSL — in-memory, the `procedural-wgsl` package, or a `vite-wgsl`-style file
  loader — stays swappable). A resolved module carries its own `dependencies` (other
  module ids), so the module dependency graph lives with the modules, not the
  primitive schema.
- Emit order is **dependencies-first, deduplicated** (post-order DFS). The result is
  a flat WGSL function library for the slice; M6 will linker-assemble entry points
  and tree-shake at the WGSL level.

## Files

- `packages/compiler/src/codegen.ts` — types + `generateWgsl` *(new)*
- `packages/compiler/src/index.ts` — re-export `codegen.ts` *(update; keep prior exports)*
- `packages/compiler/src/codegen.test.ts` — the gate *(new)*

No new dependencies (already depends on `@virtual-planet/graph`). No `procedural-wgsl`
file resolver yet — the gate uses an in-memory resolver; the real file/`procedural-wgsl`
resolver is a later follow-on.

## Public surface (`codegen.ts`)

```ts
import type { GraphSlice } from './slice.js';
import { getPrimitive } from '@virtual-planet/graph';

/** A resolved WGSL function module (exports functions, not a complete shader). */
export interface WgslModule {
	id: string;
	source: string;
	dependencies?: string[]; // other module ids this one needs
}

/** Maps a stable module id to its source. Implementations: in-memory, procedural-wgsl, file loader. */
export interface WgslModuleResolver {
	resolve(moduleId: string): Promise<WgslModule>;
}

export interface GeneratedWgsl {
	code: string; // concatenated module sources, dependency-ordered, deduped
	moduleIds: string[]; // included modules in emit order
}

export function generateWgsl(slice: GraphSlice, resolver: WgslModuleResolver): Promise<GeneratedWgsl>;
```

## Algorithm

1. For each `node` in `slice.nodes`: `const prim = getPrimitive(node.primitive)`; if
   `undefined` → **throw** `Error(\`Unknown primitive: ${node.primitive}\`)`. Collect
   `prim.wgsl.moduleId` as a **root** module id (preserve first-seen order).
2. Post-order DFS from each root through `module.dependencies`, using a `visited`
   set (dedup + cycle-safe): resolve a module, recurse into its deps **first**, then
   append the module to the emit order if not already emitted.
3. `moduleIds` = the emit order (deps before dependents, each once).
4. `code` = the modules' `source` strings joined by `"\n\n"`.

No type/space validation (that's M1), no entry-point assembly or dead-code removal
(M6).

## The gate (`codegen.test.ts`) — must pass

```ts
import { describe, expect, it } from 'vitest';
import { registerPrimitive } from '@virtual-planet/graph';
import type { GraphSlice } from './slice.js';
import { generateWgsl, type WgslModule, type WgslModuleResolver } from './codegen.js';

registerPrimitive({ id: 'test.a', category: 'test', inputs: [], outputs: [{ name: 'value', dataType: 'f32' }], params: [], wgsl: { moduleId: 'mod.a', entry: 'a' } });
registerPrimitive({ id: 'test.b', category: 'test', inputs: [], outputs: [{ name: 'value', dataType: 'f32' }], params: [], wgsl: { moduleId: 'mod.b', entry: 'b' } });

const modules: Record<string, WgslModule> = {
	'mod.util': { id: 'mod.util', source: 'fn util() -> f32 { return 1.0; }' },
	'mod.a': { id: 'mod.a', source: 'fn a() -> f32 { return util(); }', dependencies: ['mod.util'] },
	'mod.b': { id: 'mod.b', source: 'fn b() -> f32 { return 2.0; }' },
};
const resolver: WgslModuleResolver = { resolve: async (id) => modules[id] };

function sliceWith(primIds: string[]): GraphSlice {
	return {
		nodes: primIds.map((p, i) => ({
			id: `n${i}`,
			primitive: p,
			inputs: [],
			outputs: [{ id: 'value', name: 'value', direction: 'out', dataType: 'f32' }],
		})),
		edges: [],
		outputs: [],
	};
}

describe('@virtual-planet/compiler generateWgsl', () => {
	it('emits only the modules the slice needs, dependencies first', async () => {
		const g = await generateWgsl(sliceWith(['test.a']), resolver);
		expect(g.moduleIds).toEqual(['mod.util', 'mod.a']);
		expect(g.moduleIds).not.toContain('mod.b');
		expect(g.code).toContain('fn a()');
		expect(g.code).toContain('fn util()');
		expect(g.code).not.toContain('fn b()');
	});

	it('deduplicates shared modules', async () => {
		const g = await generateWgsl(sliceWith(['test.a', 'test.a']), resolver);
		expect(g.moduleIds.filter((m) => m === 'mod.a')).toHaveLength(1);
		expect(g.moduleIds.filter((m) => m === 'mod.util')).toHaveLength(1);
	});

	it('throws if a node references an unregistered primitive', async () => {
		await expect(generateWgsl(sliceWith(['test.unknown']), resolver)).rejects.toThrow();
	});
});
```

## Out of scope

No entry-point/stage assembly, no WGSL-level tree shaking, no `ShaderLinker` (all M6);
no real file/`procedural-wgsl` resolver (later follow-on); no validation. **No new
public exports beyond those listed.**

## Done when

`npm run check -w @virtual-planet/compiler` and `npm test -w @virtual-planet/compiler`
are green (M4's slice tests stay green), and the public surface matches this brief.

## Handoff

→ **M6 — ShaderLinker + WGSL-level tree shaking** · executor: **Opus** pins the
`ShaderLinker` interface + assembly/dead-code rules first, then Cursor · why: with a
dependency-ordered function library per slice, the linker can assemble a stage entry
point and drop any helper the entry doesn't reach.
