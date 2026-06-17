import type { PlanetParameters } from '../params/planetParams.js';
import type { AtmosphereParameters } from '../params/atmosphereParams.js';
import type { PlanetPresetName } from '../params/presets.js';

export const CURRENT_SNAPSHOT_VERSION = 2;

export interface PlanetCameraState {
	azimuth: number;
	elevation: number;
	distance: number;
}

export interface PlanetSnapshot {
	schemaVersion: typeof CURRENT_SNAPSHOT_VERSION;
	presetName: PlanetPresetName;
	params: PlanetParameters;
	atmosphere: AtmosphereParameters;
	camera: PlanetCameraState;
}

export interface StoredPlanetDocument {
	id: string;
	name: string;
	updatedAt: number;
	snapshot: PlanetSnapshot;
}

export interface PlanetDocumentRegistry {
	schemaVersion: typeof CURRENT_SNAPSHOT_VERSION;
	documents: StoredPlanetDocument[];
}

export interface PlanetSessionEnvelope {
	schemaVersion: typeof CURRENT_SNAPSHOT_VERSION;
	snapshot: PlanetSnapshot;
	activeDocumentId: string | null;
}

export interface AppliedPlanetState {
	presetName: PlanetPresetName;
	params: PlanetParameters;
	atmosphere: AtmosphereParameters;
	camera: PlanetCameraState;
}
