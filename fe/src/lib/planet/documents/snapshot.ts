import type { PlanetParameters } from '../params/planetParams.js';
import {
	defaultAtmosphereParams,
	type AtmosphereParameters
} from '../params/atmosphereParams.js';
import type { PlanetPresetName } from '../params/presets.js';
import { CURRENT_SNAPSHOT_VERSION, type AppliedPlanetState, type PlanetCameraState, type PlanetSnapshot } from './types.js';

export interface SnapshotInput {
	presetName: PlanetPresetName;
	params: PlanetParameters;
	/** Optional — defaults to radius-derived atmosphere when omitted. */
	atmosphere?: AtmosphereParameters;
	camera: PlanetCameraState;
}

export function toSnapshot(input: SnapshotInput): PlanetSnapshot {
	const atmosphere = input.atmosphere ?? defaultAtmosphereParams(input.params.radius);
	return {
		schemaVersion: CURRENT_SNAPSHOT_VERSION,
		presetName: input.presetName,
		params: { ...input.params },
		atmosphere: { ...atmosphere },
		camera: { ...input.camera }
	};
}

export function applySnapshot(snapshot: PlanetSnapshot): AppliedPlanetState {
	return {
		presetName: snapshot.presetName,
		params: { ...snapshot.params },
		atmosphere: { ...snapshot.atmosphere },
		camera: { ...snapshot.camera }
	};
}
