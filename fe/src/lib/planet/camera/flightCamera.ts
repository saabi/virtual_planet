import type { Vec3 } from '../math/vec.js';
import { len3, normalize3, sub3 } from '../math/vec.js';
import { geodeticToEcef } from '../math/geodetic.js';
import type { CameraState } from './cameraModes.js';
import { createOrbitCamera } from './orbitCamera.js';

export interface FlightCameraInput {
	position: Vec3;
	yaw: number;
	pitch: number;
	fovDeg: number;
	aspect: number;
	near: number;
	far: number;
	planetRadius: number;
}

export function createFlightCamera(input: FlightCameraInput): CameraState {
	const { position, yaw, pitch, fovDeg, aspect, near, far, planetRadius } = input;
	const cosP = Math.cos(pitch);
	const forward: Vec3 = normalize3([
		cosP * Math.sin(yaw),
		Math.sin(pitch),
		cosP * Math.cos(yaw)
	]);
	const target = [position[0] + forward[0], position[1] + forward[1], position[2] + forward[2]] as Vec3;
	const orbit = createOrbitCamera({
		distance: len3(position),
		azimuth: Math.atan2(position[2], position[0]),
		elevation: Math.asin(position[1] / (len3(position) || 1)),
		fovDeg,
		aspect,
		near,
		far,
		planetRadius
	});
	const altitudeMeters = Math.max(len3(position) - planetRadius, 0);
	const geo = { latRad: pitch, lonRad: yaw, altitudeMeters };
	return {
		...orbit,
		mode: altitudeMeters < 5000 ? 'surface' : 'flight',
		geodetic: geo,
		ecef: geodeticToEcef(geo),
		altitudeMeters,
		position,
		target
	};
}

export function nudgeFlightCamera(cam: CameraState, deltaPos: Vec3): CameraState {
	return createFlightCamera({
		position: [cam.position[0] + deltaPos[0], cam.position[1] + deltaPos[1], cam.position[2] + deltaPos[2]],
		yaw: Math.atan2(cam.target[2] - cam.position[2], cam.target[0] - cam.position[0]),
		pitch: Math.asin(
			(cam.target[1] - cam.position[1]) / (len3(sub3(cam.target, cam.position)) || 1)
		),
		fovDeg: 60,
		aspect: 1,
		near: 0.1,
		far: 100_000,
		planetRadius: 100
	});
}
