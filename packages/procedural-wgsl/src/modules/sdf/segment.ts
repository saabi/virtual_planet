/** WGSL module `sdf.segment` — 2D segment signed distance (reauthored metric SDF). */
export const SDF_SEGMENT_SOURCE = `/*---
id: sdf.segment
entry: sdfSegment
category: SDF
group: Geometry
source: reauthored
sourceSymbol: sdSegment
---*/
fn sdfSegment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
	let pa = p - a;
	let ba = b - a;
	let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}`;

export const SDF_SEGMENT_MODULE = {
	id: 'sdf.segment',
	source: SDF_SEGMENT_SOURCE
} as const;
