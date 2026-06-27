/** Column-major 4×4 matrix. */
export type Mat4 = readonly number[];

export type Vec3 = readonly [number, number, number];

/** Plane in Hessian form with an inward-pointing unit normal. */
export interface Plane {
	normal: Vec3;
	constant: number;
}

/** Six planes ordered left, right, bottom, top, near, far. */
export interface Frustum {
	planes: Plane[];
}

export interface Ray {
	origin: Vec3;
	direction: Vec3;
}

type Vec4 = readonly [number, number, number, number];

function add(a: Vec4, b: Vec4): Vec4 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

function subtract(a: Vec4, b: Vec4): Vec4 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

function plane(coefficients: Vec4): Plane {
	const length = Math.hypot(coefficients[0], coefficients[1], coefficients[2]);
	return {
		normal: [
			coefficients[0] / length,
			coefficients[1] / length,
			coefficients[2] / length
		],
		constant: coefficients[3] / length
	};
}

function unproject(x: number, y: number, z: number, matrix: Mat4): Vec3 {
	const worldX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
	const worldY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
	const worldZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
	const worldW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
	return [worldX / worldW, worldY / worldW, worldZ / worldW];
}

export function frustumFromViewProjection(viewProj: Mat4): Frustum {
	const row0: Vec4 = [viewProj[0], viewProj[4], viewProj[8], viewProj[12]];
	const row1: Vec4 = [viewProj[1], viewProj[5], viewProj[9], viewProj[13]];
	const row2: Vec4 = [viewProj[2], viewProj[6], viewProj[10], viewProj[14]];
	const row3: Vec4 = [viewProj[3], viewProj[7], viewProj[11], viewProj[15]];

	return {
		planes: [
			plane(add(row3, row0)),
			plane(subtract(row3, row0)),
			plane(add(row3, row1)),
			plane(subtract(row3, row1)),
			plane(row2),
			plane(subtract(row3, row2))
		]
	};
}

export function pointerRay(ndcX: number, ndcY: number, invViewProj: Mat4): Ray {
	const origin = unproject(ndcX, ndcY, 0, invViewProj);
	const far = unproject(ndcX, ndcY, 1, invViewProj);
	const x = far[0] - origin[0];
	const y = far[1] - origin[1];
	const z = far[2] - origin[2];
	const length = Math.hypot(x, y, z);

	return {
		origin,
		direction: [x / length, y / length, z / length]
	};
}
