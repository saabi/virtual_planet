import type { RenderMode } from '../patches/types.js';
import type { GeodeticPosition } from '../math/geodetic.js';
import type { Vec3d } from '../math/vec.js';
import type { Quat } from '../scene/types.js';

export interface CameraState {
	mode: RenderMode;
	geodetic: GeodeticPosition;
	ecef: Vec3d;
	altitudeMeters: number;
	viewMatrix: Float32Array;
	projectionMatrix: Float32Array;
	viewProjectionMatrix: Float32Array;
	focalLengthPx: number;
	position: [number, number, number];
	target: [number, number, number];
	cameraRotation?: Quat;
}

export const ORBIT_ENTER_ALTITUDE = 50_000;
export const SURFACE_ENTER_ALTITUDE = 5_000;
export const FLIGHT_ENTER_ALTITUDE = 20_000;

/** Reference radius (meters) the altitude thresholds above were tuned for. */
export const REFERENCE_PLANET_RADIUS = 6_371_000;

function scaledThresholds(planetRadius: number) {
	const scale = planetRadius / REFERENCE_PLANET_RADIUS;
	return {
		orbitEnter: ORBIT_ENTER_ALTITUDE * scale,
		surfaceEnter: SURFACE_ENTER_ALTITUDE * scale,
		flightEnter: FLIGHT_ENTER_ALTITUDE * scale
	};
}

export function selectRenderMode(
	altitudeMeters: number,
	current: RenderMode,
	planetRadius: number
): RenderMode {
	const { orbitEnter, surfaceEnter, flightEnter } = scaledThresholds(planetRadius);
	if (current === 'orbit' && altitudeMeters < orbitEnter) return 'flight';
	if (current === 'flight' && altitudeMeters < surfaceEnter) return 'surface';
	if (current === 'surface' && altitudeMeters > surfaceEnter * 1.5) return 'flight';
	if (current === 'flight' && altitudeMeters > flightEnter * 1.5) return 'orbit';
	return current;
}

export function blendPatchModes(mode: RenderMode): { cubeSphere: boolean; surface: boolean } {
	switch (mode) {
		case 'orbit':
			return { cubeSphere: true, surface: false };
		case 'flight':
			return { cubeSphere: true, surface: true };
		case 'surface':
			return { cubeSphere: false, surface: true };
	}
}
