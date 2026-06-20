import type { Vec3 } from '../math/vec.js';
import { cross3, normalize3, sub3 } from '../math/vec.js';

// Orbit camera + the column-major 4x4 math the scene-3d pass needs (mat4.ts only has
// invert4). WebGPU clip space: z ∈ [0, 1]. See scene-3d-viewport.md.

export interface OrbitCamera {
	/** Azimuth (radians) around +Y. */
	azimuth: number;
	/** Elevation (radians) from the XZ plane; clamped near ±90°. */
	elevation: number;
	/** Distance from the target (metres). */
	distance: number;
	/** World-space point the camera orbits. */
	target: Vec3;
}

const EL_LIMIT = Math.PI / 2 - 0.05;

export function clampElevation(e: number): number {
	return Math.max(-EL_LIMIT, Math.min(EL_LIMIT, e));
}

/** Camera eye position from the orbit parameters. */
export function cameraEye(cam: OrbitCamera): Vec3 {
	const ce = Math.cos(cam.elevation);
	const dir: Vec3 = [ce * Math.sin(cam.azimuth), Math.sin(cam.elevation), ce * Math.cos(cam.azimuth)];
	return [
		cam.target[0] + cam.distance * dir[0],
		cam.target[1] + cam.distance * dir[1],
		cam.target[2] + cam.distance * dir[2]
	];
}

/** Column-major a·b. */
export function multiply4(a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16);
	for (let c = 0; c < 4; c++) {
		for (let r = 0; r < 4; r++) {
			out[c * 4 + r] =
				a[0 * 4 + r] * b[c * 4 + 0] +
				a[1 * 4 + r] * b[c * 4 + 1] +
				a[2 * 4 + r] * b[c * 4 + 2] +
				a[3 * 4 + r] * b[c * 4 + 3];
		}
	}
	return out;
}

/** Right-handed look-at view matrix (camera looks down -Z). */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Float32Array {
	const z = normalize3(sub3(eye, target)); // forward = eye→target is -z
	const x = normalize3(cross3(up, z));
	const y = cross3(z, x);
	const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	// prettier-ignore
	return new Float32Array([
		x[0], y[0], z[0], 0,
		x[1], y[1], z[1], 0,
		x[2], y[2], z[2], 0,
		-dot(x, eye), -dot(y, eye), -dot(z, eye), 1
	]);
}

/** Perspective projection for WebGPU (z ∈ [0,1]). */
export function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
	const f = 1 / Math.tan(fovy / 2);
	const nf = 1 / (near - far);
	// prettier-ignore
	return new Float32Array([
		f / aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, far * nf, -1,
		0, 0, near * far * nf, 0
	]);
}

/** View·projection for the camera at the given aspect ratio. */
export function viewProjection(cam: OrbitCamera, aspect: number): Float32Array {
	const eye = cameraEye(cam);
	const view = lookAt(eye, cam.target);
	const near = Math.max(1, cam.distance * 0.002);
	const far = cam.distance * 20;
	const proj = perspective(Math.PI / 4, aspect, near, far);
	return multiply4(proj, view);
}
