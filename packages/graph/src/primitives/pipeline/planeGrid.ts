/** CPU mirror of `plane_grid_position` / triangle-list topology for `geometry.plane`. */

export interface PlaneGridTransform {
	width: number;
	height: number;
	rotationX: number;
	rotationY: number;
	rotationZ: number;
}

export const DEFAULT_PLANE_GRID_TRANSFORM: PlaneGridTransform = {
	width: 2,
	height: 2,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0
};

export function planeGridVertexCount(resU: number, resV: number): number {
	return Math.max(0, resU - 1) * Math.max(0, resV - 1) * 6;
}

/** Euler XYZ rotation (radians): Rx then Ry then Rz — matches procedural-wgsl `plane_grid_euler_rotate`. */
export function planeGridEulerRotate(
	x: number,
	y: number,
	z: number,
	rotX: number,
	rotY: number,
	rotZ: number
): [number, number, number] {
	const cosX = Math.cos(rotX);
	const sinX = Math.sin(rotX);
	let y1 = y * cosX - z * sinX;
	let z1 = y * sinX + z * cosX;
	let x1 = x;

	const cosY = Math.cos(rotY);
	const sinY = Math.sin(rotY);
	const x2 = x1 * cosY + z1 * sinY;
	const z2 = -x1 * sinY + z1 * cosY;
	const y2 = y1;

	const cosZ = Math.cos(rotZ);
	const sinZ = Math.sin(rotZ);
	const x3 = x2 * cosZ - y2 * sinZ;
	const y3 = x2 * sinZ + y2 * cosZ;
	return [x3, y3, z2];
}

function planeGridLocalPosition(
	u: number,
	v: number,
	transform: PlaneGridTransform
): [number, number, number] {
	const x = (u * 2 - 1) * (transform.width * 0.5);
	const y = (1 - v * 2) * (transform.height * 0.5);
	return planeGridEulerRotate(
		x,
		y,
		0,
		transform.rotationX,
		transform.rotationY,
		transform.rotationZ
	);
}

/** Map a triangle-list vertex id to clip-space plane position (matches procedural-wgsl). */
export function planeGridPosition(
	vid: number,
	resU: number,
	resV: number,
	transform: PlaneGridTransform = DEFAULT_PLANE_GRID_TRANSFORM
): [number, number, number] {
	const quadsPerRow = resU - 1;
	const quadIdx = Math.floor(vid / 6);
	const cornerInTri = vid % 6;
	const quadU = quadIdx % quadsPerRow;
	const quadV = Math.floor(quadIdx / quadsPerRow);

	let uLocal = 0;
	let vLocal = 0;
	switch (cornerInTri) {
		case 0:
			uLocal = 0;
			vLocal = 0;
			break;
		case 1:
			uLocal = 1;
			vLocal = 0;
			break;
		case 2:
			uLocal = 0;
			vLocal = 1;
			break;
		case 3:
			uLocal = 1;
			vLocal = 0;
			break;
		case 4:
			uLocal = 1;
			vLocal = 1;
			break;
		default:
			uLocal = 0;
			vLocal = 1;
			break;
	}

	const u = (quadU + uLocal) / (resU - 1);
	const v = (quadV + vLocal) / (resV - 1);
	return planeGridLocalPosition(u, v, transform);
}

/** Flattened xyz positions for every triangle-list vertex. */
export function planeGridMeshPositions(
	resU: number,
	resV: number,
	transform: PlaneGridTransform = DEFAULT_PLANE_GRID_TRANSFORM
): number[] {
	const count = planeGridVertexCount(resU, resV);
	const positions: number[] = [];
	for (let vid = 0; vid < count; vid++) {
		positions.push(...planeGridPosition(vid, resU, resV, transform));
	}
	return positions;
}
