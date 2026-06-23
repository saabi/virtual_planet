import {
	DEFAULT_MATERIAL_OVERRIDES,
	type MaterialOverrides
} from '$lib/planet/material/biomes.js';
import {
	DEFAULT_TESSELLATION,
	type TessellationSettings
} from '$lib/planet/patches/tessellationSettings.js';

export interface ViewportDebugSettings {
	wireframe: boolean;
	faceColors: boolean;
	showPatchBorders: boolean;
	showRingColors: boolean;
}

export interface SceneViewportPrefs {
	debug: ViewportDebugSettings;
	tessellation: TessellationSettings;
	materialOverrides: MaterialOverrides;
}

export function createDefaultViewportPrefs(): SceneViewportPrefs {
	return {
		debug: {
			wireframe: false,
			faceColors: false,
			showPatchBorders: false,
			showRingColors: false
		},
		tessellation: { ...DEFAULT_TESSELLATION },
		materialOverrides: { ...DEFAULT_MATERIAL_OVERRIDES }
	};
}
