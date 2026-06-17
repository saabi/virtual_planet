import { geodeticToEcef } from '../math/geodetic.js';
import type { Vec3 } from '../math/vec.js';
import { cross3, dot3, len3, normalize3, sub3 } from '../math/vec.js';
import type { CameraState } from './cameraModes.js';

export interface OrbitCameraInput {
	distance: number;
	azimuth: number;
	elevation: number;
	fovDeg: number;
	aspect: number;
	near: number;
	far: number;
	planetRadius: number;
}

export function createOrbitCamera(input: OrbitCameraInput): CameraState {
	const { distance, azimuth, elevation, fovDeg, aspect, near, far, planetRadius } = input;
	const cosEl = Math.cos(elevation);
	const position: Vec3 = [
		distance * cosEl * Math.cos(azimuth),
		distance * Math.sin(elevation),
		distance * cosEl * Math.sin(azimuth)
	];
	const target: Vec3 = [0, 0, 0];
	const view = lookAt(position, target, [0, 1, 0]);
	const projection = perspective(fovDeg, aspect, near, far);
	const viewProjection = multiply4(projection, view);
	const altitudeMeters = Math.max(len3(position) - planetRadius, 0);
	const geo = { latRad: elevation, lonRad: azimuth, altitudeMeters };
	const ecef = geodeticToEcef(geo);
	const focalLengthPx = (0.5 * 1080) / Math.tan((fovDeg * Math.PI) / 360);

	return {
		mode: 'orbit',
		geodetic: geo,
		ecef,
		altitudeMeters,
		viewMatrix: view,
		projectionMatrix: projection,
		viewProjectionMatrix: viewProjection,
		focalLengthPx,
		position,
		target
	};
}

export function updateOrbitCamera(
	cam: CameraState,
	input: Partial<OrbitCameraInput>
): CameraState {
	return createOrbitCamera({
		distance: input.distance ?? len3(cam.position),
		azimuth: input.azimuth ?? Math.atan2(cam.position[2], cam.position[0]),
		elevation: input.elevation ?? Math.asin(cam.position[1] / (len3(cam.position) || 1)),
		fovDeg: input.fovDeg ?? 60,
		aspect: input.aspect ?? 1,
		near: input.near ?? 0.1,
		far: input.far ?? 100_000,
		planetRadius: input.planetRadius ?? 100
	});
}

function lookAt(eye: Vec3, center: Vec3, up: Vec3): Float32Array {
	const f = normalize3(sub3(center, eye));
	const s = normalize3(cross3(f, up));
	const u = cross3(s, f);
	return new Float32Array([
		s[0], u[0], -f[0], 0,
		s[1], u[1], -f[1], 0,
		s[2], u[2], -f[2], 0,
		-dot3(s, eye), -dot3(u, eye), dot3(f, eye), 1
	]);
}

function perspective(fovDeg: number, aspect: number, near: number, far: number): Float32Array {
	const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
	const nf = 1 / (near - far);
	return new Float32Array([
		f / aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, (far + near) * nf, -1,
		0, 0, 2 * far * near * nf, 0
	]);
}

function multiply4(a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16);
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			out[col * 4 + row] =
				a[row] * b[col * 4] +
				a[4 + row] * b[col * 4 + 1] +
				a[8 + row] * b[col * 4 + 2] +
				a[12 + row] * b[col * 4 + 3];
		}
	}
	return out;
}
