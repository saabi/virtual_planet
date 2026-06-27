# Brief — M7: CPU runtime services

**Milestone:** M7 ([implementation-plan.md](../implementation-plan.md)) ·
**Package:** `@virtual-planet/runtime-cpu` · **Depends on:** M0 (scaffold) ·
**Stream doc:** [inputs-cpu-and-resources.md](../inputs-cpu-and-resources.md)
(generic CPU runtime services) · **Contract author:** Opus · **Recommended
executor:** Cursor.

## Objective

Provide the generic, framework-agnostic CPU services the editor and consumers need:
**camera frustum** (six planes from a view-projection matrix, for culling/LOD) and
**pointer → world ray** (for picking). Pure math, fully headless-testable. These are
the mechanism by which scene-context inputs (camera, etc.) reach the graph as input
ports — they carry **no scene-tree awareness** (per
[editor-and-scene-integration.md](../editor-and-scene-integration.md)).

## Files

- `packages/runtime-cpu/src/camera.ts` — types + `frustumFromViewProjection` + `pointerRay` *(new)*
- `packages/runtime-cpu/src/index.ts` — re-export `camera.ts` *(update; keep `RUNTIME_CPU_PACKAGE`)*
- `packages/runtime-cpu/src/camera.test.ts` — the gate *(new)*

No dependencies. Plain `number[]` math; no external vec/mat lib.

## Conventions

- `Mat4` is **column-major, length 16** (WebGPU/WGSL convention): element at row `r`,
  column `c` is `m[c * 4 + r]`; so matrix **row `r`** = `[m[r], m[4+r], m[8+r], m[12+r]]`.
- NDC follows **WebGPU**: clip `z ∈ [0, 1]` (near = 0, far = 1); `x, y ∈ [-1, 1]`.

## Public surface (`camera.ts`)

```ts
export type Mat4 = readonly number[]; // length 16, column-major
export type Vec3 = readonly [number, number, number];

/** Plane in Hessian form: normal·p + constant = 0; `normal` is unit length, pointing inward. */
export interface Plane {
	normal: Vec3;
	constant: number;
}

/** Six planes, order: left, right, bottom, top, near, far. */
export interface Frustum {
	planes: Plane[];
}

export interface Ray {
	origin: Vec3;
	direction: Vec3; // unit length
}

export function frustumFromViewProjection(viewProj: Mat4): Frustum;

/** ndcX, ndcY ∈ [-1, 1]; invViewProj is the inverse of the camera's view-projection. */
export function pointerRay(ndcX: number, ndcY: number, invViewProj: Mat4): Ray;
```

## Algorithm

**Frustum (Gribb–Hartmann).** With matrix rows `row0..row3` as defined above
(each a `vec4 = [x, y, z, w]`):

```
left   = row3 + row0      right = row3 - row0
bottom = row3 + row1      top   = row3 - row1
near   = row2             far   = row3 - row2     // WebGPU z ∈ [0,1]
```

For each, `normal = (x, y, z)`, `constant = w`, then **normalize**: divide both by
`length(normal)`. Inward-pointing (a point inside the frustum gives
`normal·p + constant ≥ 0` for all six).

**Pointer ray.** Unproject near and far points through `invViewProj`:
`nearWorld = unproject(ndcX, ndcY, 0)`, `farWorld = unproject(ndcX, ndcY, 1)`, where
`unproject` multiplies `[ndcX, ndcY, ndcZ, 1]` by `invViewProj` and divides by `w`.
`origin = nearWorld`; `direction = normalize(farWorld - nearWorld)`.

## The gate (`camera.test.ts`) — must pass

```ts
import { describe, expect, it } from 'vitest';
import type { Mat4, Plane, Vec3 } from './camera.js';
import { frustumFromViewProjection, pointerRay } from './camera.js';

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const len = (n: Vec3) => Math.hypot(n[0], n[1], n[2]);
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const hasPlane = (planes: Plane[], n: Vec3, c: number) =>
	planes.some((p) => near(p.normal[0], n[0]) && near(p.normal[1], n[1]) && near(p.normal[2], n[2]) && near(p.constant, c));

describe('@virtual-planet/runtime-cpu camera', () => {
	it('extracts six normalized frustum planes', () => {
		const f = frustumFromViewProjection(IDENTITY);
		expect(f.planes).toHaveLength(6);
		for (const p of f.planes) expect(near(len(p.normal), 1)).toBe(true);
	});

	it('identity frustum has the expected left/right planes and rejects an out-of-bounds point', () => {
		const f = frustumFromViewProjection(IDENTITY);
		expect(hasPlane(f.planes, [1, 0, 0], 1)).toBe(true); // left:  x ≥ -1
		expect(hasPlane(f.planes, [-1, 0, 0], 1)).toBe(true); // right: x ≤  1
		const outside: Vec3 = [2, 0, 0.5];
		expect(f.planes.some((p) => p.normal[0] * outside[0] + p.normal[1] * outside[1] + p.normal[2] * outside[2] + p.constant < 0)).toBe(true);
	});

	it('pointer ray through identity points down +z from the near plane', () => {
		const r = pointerRay(0, 0, IDENTITY);
		expect(near(r.origin[0], 0) && near(r.origin[1], 0) && near(r.origin[2], 0)).toBe(true);
		expect(near(r.direction[0], 0) && near(r.direction[1], 0) && near(r.direction[2], 1)).toBe(true);
	});
});
```

## Out of scope

No resource sampling (image/mesh/audio — that's M8), no `time` source plumbing (a
trivial passthrough; add later if a consumer needs it), no GPU, no scene-tree
awareness, no editor. **No new public exports beyond those listed.**

## Done when

`npm run check -w @virtual-planet/runtime-cpu` and
`npm test -w @virtual-planet/runtime-cpu` are green, and the public surface matches
this brief.

## Handoff

→ **M8 — Resource inputs** (`runtime-cpu`/`graph`: image/mesh/audio typed ports with
CPU views) · executor: Opus pins the resource port types, then Cursor · why: with the
generic CPU services in place, the remaining CPU-runtime piece is typed external
resources, after which the standalone editor (M9) has everything it needs for preview
and picking. (M3 — self-describing WGSL loader — also remains unblocked in parallel.)
