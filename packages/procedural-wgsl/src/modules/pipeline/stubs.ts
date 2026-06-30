export const GEOMETRY_FULLSCREEN_PLANE_SOURCE = `/*---
id: geometry.fullscreenPlane
entry: fullscreenPlane
category: Pipeline
---*/
fn fullscreenPlane() {
}`;

export const GEOMETRY_PLANE_SOURCE = `/*---
id: geometry.plane
entry: planeGrid
category: Pipeline
---*/
fn planeGrid() {
}`;

export const BUFFER_PERSIST_SOURCE = `/*---
id: buffer.persist
entry: persistGeometry
category: Pipeline
---*/
fn persistGeometry() {
}`;

export const STAGE_VERTEX_SOURCE = `/*---
id: stage.vertex
entry: vertexStage
category: Pipeline
---*/
fn vertexStage() {
}`;

export const STAGE_FRAGMENT_SOURCE = `/*---
id: stage.fragment
entry: fragmentStage
category: Pipeline
---*/
fn fragmentStage() {
}`;

export const TARGET_DISPLAY_SOURCE = `/*---
id: target.display
entry: displayTarget
category: Pipeline
---*/
fn displayTarget() {
}`;

export const GEOMETRY_FULLSCREEN_PLANE_MODULE = {
	id: 'geometry.fullscreenPlane',
	source: GEOMETRY_FULLSCREEN_PLANE_SOURCE
} as const;

export const GEOMETRY_PLANE_MODULE = {
	id: 'geometry.plane',
	source: GEOMETRY_PLANE_SOURCE
} as const;

export const BUFFER_PERSIST_MODULE = {
	id: 'buffer.persist',
	source: BUFFER_PERSIST_SOURCE
} as const;

export const STAGE_VERTEX_MODULE = {
	id: 'stage.vertex',
	source: STAGE_VERTEX_SOURCE
} as const;

export const STAGE_FRAGMENT_MODULE = {
	id: 'stage.fragment',
	source: STAGE_FRAGMENT_SOURCE
} as const;

export const TARGET_DISPLAY_MODULE = {
	id: 'target.display',
	source: TARGET_DISPLAY_SOURCE
} as const;
