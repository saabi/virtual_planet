/** WGSL module `geometry.plane` — parametric resU×resV plane grid (triangle list). */
export const GEOMETRY_PLANE_SOURCE = `/*---
id: geometry.plane
entry: planeGrid
category: Pipeline
---*/
fn plane_grid_vertex_count(resU: u32, resV: u32) -> u32 {
	return (resU - 1u) * (resV - 1u) * 6u;
}

fn plane_grid_euler_rotate(p: vec3<f32>, rotX: f32, rotY: f32, rotZ: f32) -> vec3<f32> {
	var x = p.x;
	var y = p.y;
	var z = p.z;

	let cosX = cos(rotX);
	let sinX = sin(rotX);
	let y1 = y * cosX - z * sinX;
	let z1 = y * sinX + z * cosX;
	y = y1;
	z = z1;

	let cosY = cos(rotY);
	let sinY = sin(rotY);
	let x1 = x * cosY + z * sinY;
	let z2 = -x * sinY + z * cosY;
	x = x1;
	z = z2;

	let cosZ = cos(rotZ);
	let sinZ = sin(rotZ);
	let x2 = x * cosZ - y * sinZ;
	let y2 = x * sinZ + y * cosZ;
	return vec3<f32>(x2, y2, z);
}

fn plane_grid_position(
	vid: u32,
	resU: u32,
	resV: u32,
	width: f32,
	height: f32,
	rotX: f32,
	rotY: f32,
	rotZ: f32
) -> vec3<f32> {
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
	let local = vec3<f32>((u * 2.0 - 1.0) * (width * 0.5), (1.0 - v * 2.0) * (height * 0.5), 0.0);
	return plane_grid_euler_rotate(local, rotX, rotY, rotZ);
}

fn planeGrid(vid: u32, resU: u32, resV: u32) -> vec3<f32> {
	return plane_grid_position(vid, resU, resV, 2.0, 2.0, 0.0, 0.0, 0.0);
}`;

export const GEOMETRY_PLANE_MODULE = {
	id: 'geometry.plane',
	source: GEOMETRY_PLANE_SOURCE
} as const;
