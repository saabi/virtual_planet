# WebGPU runtime & tessellation

**Status:** architecture · **Scope:** `packages/runtime-webgpu`, the existing
`patches/` / `subdivide` machinery. Part of the
[Procedural Graph System](./README.md).

## Consumers, not stages

Consumers — not shader stages — are the unit of consumption. A consumer
subscribes to outputs (see [graph-and-compiler.md](./graph-and-compiler.md)) and
may run across one or more WebGPU pipelines:

```
Terrain Mesh Generator · Terrain Material Generator · Vegetation Generator
Water Generator · Collision Generator · Physics/Navigation Generators
Atmosphere Generator · LOD Generator · Debug Visualizers
```

The graph itself has no knowledge of stages. Examples: terrain mesh = compute
producing vertex/index buffers; terrain rendering = vertex+fragment; vegetation =
compute producing instances + instanced render; debug = storage visualization.

## Generic tessellation providers

Tessellation is **modular**, topology-agnostic, and — crucially — **built from
primitives, not a privileged subsystem** (see
[inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md)). A tessellator is a
surface-mapping primitive (`uv → position / normal`) plus a mesh-generation
consumer primitive (compute emitting vertex/index buffers), each with optional CPU
support. It exposes generic parametric surface patches (uv→worldPosition, →normal,
tangents, bounds, optional LOD) and knows nothing of "planet" or "cube-sphere". A
cube-sphere is therefore a *composition of six projected plane patches* — a
standard-library composition of primitives, not a hardcoded tessellator.

```ts
type TessellationSurface = {
  id: string;
  domain: 'plane' | 'cubeFace' | 'custom';
  uvToPosition: WgslSourceRef;
  uvToNormal?: WgslSourceRef;
  bounds?: SurfaceBounds;
};
```

Providers: Plane, Cube Face, Cube Sphere, Terrain Tile, Ocean, Custom. The same
graph runs unchanged on a plane, a tile, a cube face, a cube sphere, or future
surfaces — which also lets the standalone editor test nodes on a simple plane
without loading a planet. (This generalizes the existing `patches/` cube-sphere
and `subdivide` package into one provider among several.)

## Surfaces are shared graph documents

The surface *mapping* (`uv → position / normal`, the `uvToPosition`/`uvToNormal`
`WgslSourceRef`s above) is itself graph-described and lives in the shared document
store (see [collaboration-and-mcp.md](./collaboration-and-mcp.md)) — including the
planet's own cube-sphere. So the cube-sphere becomes a **standard-library surface
document** that both the standalone editor and the planet app load and edit;
authoring or tweaking it in one app flows directly to the other, with no
import/export or conversion.

To keep this honest, separate two concerns:

- **Surface mapping** — portable, graph-described, shareable data in the document
  store. This is what crosses between apps.
- **Tessellation scheduling** — LOD bands, patch culling, vertex budgeting,
  streaming. A *runtime* concern owned by `runtime-webgpu` / the existing
  `patches/` machinery, not part of the shared document.

A provider is therefore a thin runtime shell that executes a shared surface graph
under whatever scheduling its host supplies: the standalone editor runs the same
cube-sphere mapping on a cheap unscheduled mesh (via the mapping primitive's CPU
support), while the planet app runs it under full LOD — same mapping, different
scheduler. The scheduler consumes the generic CPU **frustum** service from
[inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md); nothing tessellation-
specific leaks into the core graph model.
