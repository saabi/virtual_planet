import type { RenderMode } from '../patches/types.js';
import { geodeticToEcef } from '../math/geodetic.js';
import { add3, len3, sub3, type Vec3 } from '../math/vec.js';
import {
	quatFromAxisAngle,
	quatFromRotationMatrix,
	quatMultiply,
	rotateVec3
} from '../scene/transform.js';
import type { Quat } from '../scene/types.js';
import { cameraEye, lookAt as sceneLookAt, FOVY, multiply4 as sceneMultiply4, orbitNearFar, perspective as scenePerspective, type OrbitCamera } from '../scene3d/orbitCamera.js';
import { lookAt, multiply4, perspective } from './orbitCamera.js';
import { selectRenderMode, type CameraState } from './cameraModes.js';

export interface FreeFlyState {
	position: Vec3;
	rotation: Quat;
}

export interface FreeFlyKeys {
	w: boolean;
	a: boolean;
	s: boolean;
	d: boolean;
	q: boolean;
	e: boolean;
	shift: boolean;
}

export const EMPTY_FREE_FLY_KEYS: FreeFlyKeys = {
	w: false,
	a: false,
	s: false,
	d: false,
	q: false,
	e: false,
	shift: false
};

export interface FreeFlyCameraOpts {
	fovDeg?: number;
	near?: number;
	far?: number;
	/** Planet route: altitude-driven mode + geodetic fields on CameraState. */
	planet?: { radius: number; modeState: RenderMode };
}

const DEFAULT_FOV_DEG = 60;
const LOOK_SENSITIVITY = 0.0025;
const ROLL_SPEED = 1.0;

export function createFreeFlyState(position: Vec3 = [0, 0, 0], rotation: Quat = [0, 0, 0, 1]): FreeFlyState {
	return { position: [...position] as Vec3, rotation: [...rotation] as Quat };
}

export function freeFlyKeysMoving(keys: FreeFlyKeys): boolean {
	return keys.w || keys.a || keys.s || keys.d || keys.q || keys.e;
}

/** Scene-scale fly speed from a reference body radius and current distance from origin. */
export function sceneFreeFlySpeed(position: Vec3, refRadius: number): number {
	const dist = len3(position);
	return Math.max(refRadius * 0.05, dist * 0.02);
}

/** Planet-scale fly speed from altitude above a single body. */
export function planetFreeFlySpeed(position: Vec3, planetRadius: number): number {
	const altitude = Math.max(10, len3(position) - planetRadius);
	let speed = altitude * 0.5;
	return speed;
}

export function buildFreeFlyCameraState(
	fly: FreeFlyState,
	aspect: number,
	opts: FreeFlyCameraOpts = {}
): CameraState {
	const fovDeg = opts.fovDeg ?? DEFAULT_FOV_DEG;
	const dist = len3(fly.position);
	const near = opts.near ?? 0.1;
	const far = opts.far ?? (opts.planet ? Math.max(opts.planet.radius * 20, dist * 4) : Math.max(dist * 4, 1e9));

	const forward = rotateVec3(fly.rotation, [0, 0, -1]);
	const up = rotateVec3(fly.rotation, [0, 1, 0]);
	const target = add3(fly.position, forward);

	const view = lookAt(fly.position, target, up);
	const projection = perspective(fovDeg, aspect, near, far);
	const viewProjection = multiply4(projection, view);
	const focalLengthPx = (0.5 * 1080) / Math.tan((fovDeg * Math.PI) / 360);

	const currentAzimuth = Math.atan2(fly.position[2], fly.position[0]);
	const currentElevation = Math.asin(fly.position[1] / (dist || 1));
	const altitudeMeters = opts.planet ? Math.max(dist - opts.planet.radius, 0) : 0;
	const geo = { latRad: currentElevation, lonRad: currentAzimuth, altitudeMeters };
	const ecef = geodeticToEcef(geo);

	return {
		mode: opts.planet ? selectRenderMode(altitudeMeters, opts.planet.modeState, opts.planet.radius) : 'orbit',
		geodetic: geo,
		ecef,
		altitudeMeters,
		viewMatrix: view,
		projectionMatrix: projection,
		viewProjectionMatrix: viewProjection,
		focalLengthPx,
		position: [...fly.position] as Vec3,
		target,
		cameraRotation: [...fly.rotation] as Quat
	};
}

/** Scene `/scene` free-fly camera — scene3d lookAt + orbit near/far for depth parity with spheres. */
export function buildSceneFreeFlyCameraState(
	fly: FreeFlyState,
	aspect: number,
	nearFarOverride?: [number, number]
): CameraState {
	const forward = rotateVec3(fly.rotation, [0, 0, -1]);
	const up = rotateVec3(fly.rotation, [0, 1, 0]);
	const target = add3(fly.position, forward);
	const view = sceneLookAt(fly.position, target, up);
	const dist = len3(fly.position);
	const [near, far] = nearFarOverride ?? orbitNearFar(Math.max(dist, 1e5));
	const projection = scenePerspective(FOVY, aspect, near, far);
	const viewProjection = sceneMultiply4(projection, view);
	const fovDeg = (FOVY * 180) / Math.PI;
	const focalLengthPx = (0.5 * 1080) / Math.tan((fovDeg * Math.PI) / 360);

	return {
		mode: 'orbit',
		geodetic: { latRad: 0, lonRad: 0, altitudeMeters: 0 },
		ecef: geodeticToEcef({ latRad: 0, lonRad: 0, altitudeMeters: 0 }),
		altitudeMeters: 0,
		viewMatrix: view,
		projectionMatrix: projection,
		viewProjectionMatrix: viewProjection,
		focalLengthPx,
		position: [...fly.position] as Vec3,
		target,
		cameraRotation: [...fly.rotation] as Quat
	};
}

/**
 * Eye-relative free-fly view-projection (camera translated to the origin) for
 * camera-relative passes like the atmosphere composite. Uses the same projection
 * and near/far as {@link buildSceneFreeFlyCameraState}, so clip-space depth stays
 * identical to the geometry pass (only the view translation is removed) — keeping
 * the shared depth buffer comparable while avoiding large world coordinates.
 */
export function sceneFreeFlyViewProjectionRelative(
	fly: FreeFlyState,
	aspect: number,
	nearFarOverride?: [number, number]
): Float32Array {
	const forward = rotateVec3(fly.rotation, [0, 0, -1]);
	const up = rotateVec3(fly.rotation, [0, 1, 0]);
	const view = sceneLookAt([0, 0, 0], forward, up);
	const dist = len3(fly.position);
	const [near, far] = nearFarOverride ?? orbitNearFar(Math.max(dist, 1e5));
	const projection = scenePerspective(FOVY, aspect, near, far);
	return sceneMultiply4(projection, view);
}

export function applyFreeFlyLook(
	rotation: Quat,
	dx: number,
	dy: number,
	sensitivity = LOOK_SENSITIVITY
): Quat {
	const qYaw = quatFromAxisAngle([0, 1, 0], -dx * sensitivity);
	const qPitch = quatFromAxisAngle([1, 0, 0], -dy * sensitivity);
	let next = quatMultiply(rotation, qYaw);
	next = quatMultiply(next, qPitch);
	return next;
}

export function stepFreeFly(
	fly: FreeFlyState,
	keys: FreeFlyKeys,
	dt: number,
	speed: number
): FreeFlyState {
	if (dt <= 0) return fly;

	const forward = rotateVec3(fly.rotation, [0, 0, -1]);
	const right = rotateVec3(fly.rotation, [1, 0, 0]);
	let moveDir: Vec3 = [0, 0, 0];
	if (keys.w) moveDir = [moveDir[0] + forward[0], moveDir[1] + forward[1], moveDir[2] + forward[2]];
	if (keys.s) moveDir = [moveDir[0] - forward[0], moveDir[1] - forward[1], moveDir[2] - forward[2]];
	if (keys.d) moveDir = [moveDir[0] + right[0], moveDir[1] + right[1], moveDir[2] + right[2]];
	if (keys.a) moveDir = [moveDir[0] - right[0], moveDir[1] - right[1], moveDir[2] - right[2]];

	let position = fly.position;
	const moveLen = len3(moveDir);
	if (moveLen > 0) {
		const scale = (keys.shift ? speed * 5 : speed) * dt / moveLen;
		position = [
			position[0] + moveDir[0] * scale,
			position[1] + moveDir[1] * scale,
			position[2] + moveDir[2] * scale
		];
	}

	let rotation = fly.rotation;
	let rollDir = 0;
	if (keys.q) rollDir -= 1;
	if (keys.e) rollDir += 1;
	if (rollDir !== 0) {
		const qRoll = quatFromAxisAngle([0, 0, -1], rollDir * ROLL_SPEED * dt);
		rotation = quatMultiply(rotation, qRoll);
	}

	return { position, rotation };
}

export function cameraStateToFreeFly(cam: CameraState): FreeFlyState {
	const vm = cam.viewMatrix;
	const s: Vec3 = [vm[0], vm[4], vm[8]];
	const u: Vec3 = [vm[1], vm[5], vm[9]];
	const b: Vec3 = [vm[2], vm[6], vm[10]];
	return {
		position: [...cam.position] as Vec3,
		rotation: quatFromRotationMatrix(s, u, b)
	};
}

export function orbitEyeToFreeFly(cam: OrbitCamera): FreeFlyState {
	const eye = cameraEye(cam);
	const view = sceneLookAt(eye, cam.target);
	const s: Vec3 = [view[0], view[4], view[8]];
	const u: Vec3 = [view[1], view[5], view[9]];
	const b: Vec3 = [view[2], view[6], view[10]];
	return { position: eye, rotation: quatFromRotationMatrix(s, u, b) };
}

export function freeFlyToOrbit(fly: FreeFlyState, target: Vec3): OrbitCamera {
	const offset = sub3(fly.position, target);
	const distance = Math.max(len3(offset), 1);
	const elevation = Math.asin(Math.max(-1, Math.min(1, offset[1] / distance)));
	const azimuth = Math.atan2(offset[2], offset[0]);
	return { azimuth, elevation, distance, target: [...target] as Vec3 };
}
