/** WGSL module `stage.vertex` — identity clip projection from wired plane-grid geometry. */
export const STAGE_VERTEX_SOURCE = `/*---
id: stage.vertex
entry: vertexStage
category: Pipeline
---*/
// @use geometry.plane

fn vertexStage(vid: u32, resU: u32, resV: u32) -> vec4<f32> {
	let p = plane_grid_position(vid, resU, resV);
	return vec4<f32>(p, 1.0);
}`;

export const STAGE_VERTEX_MODULE = {
	id: 'stage.vertex',
	source: STAGE_VERTEX_SOURCE,
	dependencies: ['geometry.plane'] as const
} as const;
