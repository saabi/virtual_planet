/** WGSL module `geometry.plane` — parametric resU×resV plane grid (triangle list). */
export const GEOMETRY_PLANE_SOURCE = `/*---
id: geometry.plane
entry: planeGrid
category: Pipeline
---*/
fn plane_grid_vertex_count(resU: u32, resV: u32) -> u32 {
	return (resU - 1u) * (resV - 1u) * 6u;
}

fn plane_grid_position(vid: u32, resU: u32, resV: u32) -> vec3<f32> {
	let quadsPerRow = resU - 1u;
	let quadIdx = vid / 6u;
	let cornerInTri = vid % 6u;
	let quadU = quadIdx % quadsPerRow;
	let quadV = quadIdx / quadsPerRow;

	var uLocal: f32;
	var vLocal: f32;
	switch cornerInTri {
		case 0u: { uLocal = 0.0; vLocal = 0.0; }
		case 1u: { uLocal = 1.0; vLocal = 0.0; }
		case 2u: { uLocal = 0.0; vLocal = 1.0; }
		case 3u: { uLocal = 1.0; vLocal = 0.0; }
		case 4u: { uLocal = 1.0; vLocal = 1.0; }
		default: { uLocal = 0.0; vLocal = 1.0; }
	}

	let u = (f32(quadU) + uLocal) / f32(resU - 1u);
	let v = (f32(quadV) + vLocal) / f32(resV - 1u);
	let x = u * 2.0 - 1.0;
	let y = 1.0 - v * 2.0;
	return vec3<f32>(x, y, 0.0);
}

fn planeGrid(vid: u32, resU: u32, resV: u32) -> vec3<f32> {
	return plane_grid_position(vid, resU, resV);
}`;

export const GEOMETRY_PLANE_MODULE = {
	id: 'geometry.plane',
	source: GEOMETRY_PLANE_SOURCE
} as const;
