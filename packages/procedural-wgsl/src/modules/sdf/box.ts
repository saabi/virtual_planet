/** WGSL module `sdf.box` — 2D axis-aligned box signed distance (reauthored metric SDF). */
export const SDF_BOX_SOURCE = `/*---
id: sdf.box
entry: sdfBox
category: SDF
group: Geometry
source: reauthored
sourceSymbol: sdBox
---*/
fn sdfBox(p: vec2<f32>, halfX: f32, halfY: f32) -> f32 {
	let q = abs(p) - vec2<f32>(halfX, halfY);
	return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0);
}`;

export const SDF_BOX_MODULE = {
	id: 'sdf.box',
	source: SDF_BOX_SOURCE
} as const;
