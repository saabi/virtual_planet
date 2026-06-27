# Brief — M11: Tessellation primitives (phased)

**Milestone:** M11 ([implementation-plan.md](../implementation-plan.md)) ·
**Packages:** `@virtual-planet/graph` (mapping primitives),
`@virtual-planet/runtime-cpu` (frustum cull), `@virtual-planet/graph-editor`
(mesh preview) · **Depends on:** M7 ✅ (frustum), M10.3 (editor preview) ·
**Design authority:** [runtime-and-tessellation.md](../runtime-and-tessellation.md),
[inputs-cpu-and-resources.md](../inputs-cpu-and-resources.md) · **Contract author:**
Opus · **Recommended executor:** Cursor (Opus owns the coordinate-space pins below).

## Objective

Tessellation is **not a privileged subsystem** — it is **primitives + runtime
scheduling**. A surface is a **mapping primitive** (`uv (+faceId) → position,
normal`); concrete surfaces (plane, cube-face, cube-sphere) are standard-library
**compositions of primitives**; **scheduling** (frustum cull / LOD) is a CPU runtime
concern consuming M7's frustum service. No surface-specific logic enters the core
graph model.

Delivered in **three serial sub-phases**. Do not start N+1 until N is green.

## M11.1 — Surface-mapping primitives (graph)

### Files
- `packages/graph/src/primitives/surfaces/plane.ts`, `cubeSphere.ts` *(new)*
- `packages/graph/src/primitives/surfaces/index.ts` — registers them *(new)*
- `packages/graph/src/primitives/index.ts` — import surfaces *(update)*
- `packages/graph/src/primitives/surfaces.test.ts` — gate *(new)*

### Pinned contract

Each surface is a registered `NodePrimitive` with **coordinate-space-typed outputs**
(this is the Opus-owned correctness point — downstream displacement/terrain validates
on these spaces):

| Primitive id | inputs | params | outputs (with space) | evalCPU |
|--------------|--------|--------|----------------------|---------|
| `surface.plane` | `uv: vec2f` | — | `position: vec3f` (space `none`), `normal: vec3f` (space `none`) | `position = (2u-1, 2v-1, 0)`, `normal = (0,0,1)` |
| `surface.cubeSphere` | `uv: vec2f` | `face: i32` (0–5) | `position: vec3f` (space **`body_pos`**), `normal: vec3f` (space **`body_dir`**) | cube point for `(uv, face)` **normalized to the unit sphere**; `normal = position` |

`surface.cubeSphere` cube-point convention: map `uv∈[0,1]²` to `s,t∈[-1,1]`; face 0
= `(+1, t, -s)` … (any consistent six-face basis is fine **as long as** face 0
center `uv=(0.5,0.5)` → `(1,0,0)` after normalization). WGSL `WgslSourceRef`s may
point at `surface.plane` / `surface.cubeSphere` module ids (modules need not exist
yet — evalCPU is the gate).

### Gate (`surfaces.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { getPrimitive } from './registry.js'; // adjust path to the registry export
import './surfaces/index.js';

const ev = (id: string, inputs: Record<string, unknown>, params: Record<string, unknown> = {}) =>
	getPrimitive(id)!.evalCPU!({ inputs: inputs as never, params: params as never });
const len = (v: number[]) => Math.hypot(...v);

describe('surface mapping primitives', () => {
	it('plane maps uv to the z=0 plane with +z normal', () => {
		const o = ev('surface.plane', { uv: [0.5, 0.5] });
		expect(o.position).toEqual([0, 0, 0]);
		expect(o.normal).toEqual([0, 0, 1]);
	});

	it('cubeSphere face 0 centre is the unit +x direction', () => {
		const o = ev('surface.cubeSphere', { uv: [0.5, 0.5] }, { face: 0 });
		const p = o.position as number[];
		expect(Math.abs(len(p) - 1)).toBeLessThan(1e-6);
		expect(p[0]).toBeGreaterThan(0.999);
		expect(o.normal).toEqual(o.position); // unit sphere
	});

	it('cubeSphere outputs declare body spaces', () => {
		const cs = getPrimitive('surface.cubeSphere')!;
		expect(cs.outputs.find((o) => o.name === 'position')!.space).toBe('body_pos');
		expect(cs.outputs.find((o) => o.name === 'normal')!.space).toBe('body_dir');
	});
});
```

## M11.2 — Frustum cull (runtime-cpu)

CPU scheduling stub: cull bounding volumes against M7's `Frustum`. Pure math, no GPU.

### Files
- `packages/runtime-cpu/src/frustumCull.ts` *(new)* · `frustumCull.test.ts` *(new)*
- `packages/runtime-cpu/src/index.ts` — re-export *(update)*

### Pinned contract

```ts
import type { Frustum, Vec3 } from './camera.js';

export interface BoundingSphere { center: Vec3; radius: number; }

/** Keep spheres not fully outside any plane (inward-pointing planes from frustumFromViewProjection). */
export function cullSpheres<T extends { bounds: BoundingSphere }>(frustum: Frustum, items: T[]): T[];
```

Rule: a sphere is **culled** iff for some plane `dot(normal, center) + constant < -radius`.

### Gate (`frustumCull.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { frustumFromViewProjection } from './camera.js';
import { cullSpheres } from './frustumCull.js';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

describe('frustum cull', () => {
	it('keeps in-frustum spheres and drops far-outside ones', () => {
		const f = frustumFromViewProjection(IDENTITY);
		const items = [
			{ id: 'in', bounds: { center: [0, 0, 0.5] as const, radius: 0.1 } },
			{ id: 'out', bounds: { center: [50, 0, 0.5] as const, radius: 0.1 } },
		];
		const kept = cullSpheres(f, items).map((i) => i.id);
		expect(kept).toContain('in');
		expect(kept).not.toContain('out');
	});

	it('keeps a large sphere straddling a plane', () => {
		const f = frustumFromViewProjection(IDENTITY);
		const kept = cullSpheres(f, [{ id: 'big', bounds: { center: [2, 0, 0.5] as const, radius: 5 } }]);
		expect(kept.map((i) => i.id)).toEqual(['big']); // radius 5 reaches inside
	});
});
```

## M11.3 — Cube-sphere mesh preview (editor) ⚠ visual

Build a mesh by evaluating `surface.cubeSphere.evalCPU` over a `uv` grid × 6 faces
(CPU preview, reusing the M10 preview plumbing) and render it in `/graph-editor`.
Keep `graph-editor` **scene-free** (the `sceneFree` guard must stay green).

### Gate
1. `npm run check` (graph-editor + fe) green; `sceneFree.test.ts` green.
2. **Manual:** `/graph-editor` shows a cube-sphere; switching the surface from plane
   to cube-sphere changes the preview geometry.

## Out of scope

LOD level selection / patch subdivision / streaming budget (later scheduler work),
GPU mesh-generation compute (M10+ follow-on), vegetation (M12), terrain displacement
(consumes these mappings but is separate).

## Handoff

→ **M12 — Vegetation consumer** ([vegetation.md](../vegetation.md)) · executor: Opus
pins the dual-frequency/peak contract, then Cursor · why: with surfaces as primitives
and frustum culling in place, the first ecology consumer can scatter on a mapped
surface using the metric-space, peak-based design.
