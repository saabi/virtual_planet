import type { PlanetParameters } from '../params/planetParams.js';
import type { PlanetPresetName } from '../params/presets.js';
import { CURRENT_SNAPSHOT_VERSION, type AppliedPlanetState, type PlanetCameraState, type PlanetSnapshot } from './types.js';

export interface SnapshotInput {
	presetName: PlanetPresetName;
	params: PlanetParameters;
	camera: PlanetCameraState;
}

export function toSnapshot(input: SnapshotInput): PlanetSnapshot {
	return {
		schemaVersion: CURRENT_SNAPSHOT_VERSION,
		presetName: input.presetName,
		params: { ...input.params },
		camera: { ...input.camera }
	};
}

export function applySnapshot(snapshot: PlanetSnapshot): AppliedPlanetState {
	return {
		presetName: snapshot.presetName,
		params: { ...snapshot.params },
		camera: { ...snapshot.camera }
	};
}
