import { MATERIAL_DEBUG_LABELS, type MaterialDebugMode } from '../material/biomes.js';

export type SceneAtmosphereDebugMode =
	| 'atmosphereWhite'
	| 'atmosphereInscatter'
	| 'atmosphereTransmittance'
	| 'atmosphereViewSun'
	| 'atmosphereSurfaceMask';

export type SceneDebugMode = MaterialDebugMode | SceneAtmosphereDebugMode;

export const SCENE_DEBUG_LABELS: { value: SceneDebugMode; label: string }[] = [
	...MATERIAL_DEBUG_LABELS,
	{ value: 'atmosphereWhite', label: 'Atmosphere on white' },
	{ value: 'atmosphereInscatter', label: 'Atmosphere inscatter' },
	{ value: 'atmosphereTransmittance', label: 'Atmosphere transmittance' },
	{ value: 'atmosphereViewSun', label: 'Atmosphere view/sun' },
	{ value: 'atmosphereSurfaceMask', label: 'Atmosphere surface mask' }
];

export function sceneMaterialDebugMode(mode: SceneDebugMode): MaterialDebugMode {
	return isSceneAtmosphereDebugMode(mode) ? 'off' : mode;
}

export function isSceneAtmosphereDebugMode(mode: SceneDebugMode): mode is SceneAtmosphereDebugMode {
	return mode.startsWith('atmosphere');
}

export function sceneAtmosphereDebugToGpu(mode: SceneDebugMode): number {
	switch (mode) {
		case 'atmosphereInscatter':
			return 1;
		case 'atmosphereTransmittance':
			return 2;
		case 'atmosphereViewSun':
			return 3;
		case 'atmosphereSurfaceMask':
			return 4;
		default:
			return 0;
	}
}
