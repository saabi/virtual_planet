export type Vec3 = [number, number, number];
export type Vec3d = [number, number, number];
export type Vec4 = [number, number, number, number];

export function add3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function sub3d(a: Vec3d, b: Vec3d): Vec3d {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale3(a: Vec3, s: number): Vec3 {
	return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function dot3d(a: Vec3d, b: Vec3d): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function len3(a: Vec3): number {
	return Math.hypot(a[0], a[1], a[2]);
}

export function len3d(a: Vec3d): number {
	return Math.hypot(a[0], a[1], a[2]);
}

export function normalize3(a: Vec3): Vec3 {
	const l = len3(a);
	if (l < 1e-12) return [0, 0, 1];
	return [a[0] / l, a[1] / l, a[2] / l];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}
