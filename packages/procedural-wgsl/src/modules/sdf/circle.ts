/** WGSL module `sdf.circle` — 2D circle signed distance (reauthored metric SDF). */
export const SDF_CIRCLE_SOURCE = `/*---
id: sdf.circle
entry: sdfCircle
category: SDF
group: Geometry
source: reauthored
sourceSymbol: sdCircle
---*/
fn sdfCircle(p: vec2<f32>, radius: f32) -> f32 {
	return length(p) - radius;
}`;

export const SDF_CIRCLE_MODULE = {
	id: 'sdf.circle',
	source: SDF_CIRCLE_SOURCE
} as const;
