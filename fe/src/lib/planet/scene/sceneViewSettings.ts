import type { OrbitLookMode } from '$lib/planet/camera/orbitCamera.js';
import { SCENE_DEBUG_LABELS, type SceneDebugMode } from '$lib/planet/scene/sceneDebug.js';
import {
	createDefaultViewportPrefs,
	type SceneViewportPrefs
} from '$lib/planet/scene/viewportPrefs.js';

// Global render/view settings for the /scene route — the knobs in the Render panel that
// are NOT body data and NOT scene structure: render quality (viewportPrefs), the material
// debug view, and the focused-body look mode. Persisted under one localStorage key so they
// survive a reload, like the scene doc (vp.systemScene) and panel layout (vp.sceneLayout).
//
// Transport/transient state (clock, playing, speed, the focused-body overlay, selection)
// is intentionally NOT persisted: playback should start running on load, and selection
// lives in the URL.

export const SCENE_VIEW_SETTINGS_KEY = 'vp.sceneViewSettings';

export interface SceneViewSettings {
	viewportPrefs: SceneViewportPrefs;
	materialDebug: SceneDebugMode;
	lookMode: OrbitLookMode;
}

export function defaultSceneViewSettings(): SceneViewSettings {
	return {
		viewportPrefs: createDefaultViewportPrefs(),
		materialDebug: 'off',
		lookMode: 'planet-center'
	};
}

function num(v: unknown, fallback: number): number {
	return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Merge a stored (possibly stale/partial) blob onto current defaults: fills missing
 *  fields, drops unknown ones, and clamps enums back to a valid value. */
export function coerceViewportPrefs(raw: unknown): SceneViewportPrefs {
	const d = createDefaultViewportPrefs();
	if (!raw || typeof raw !== 'object') return d;
	const r = raw as Record<string, unknown>;
	const debug = (r.debug ?? {}) as Record<string, unknown>;
	const atmosphere = (r.atmosphere ?? {}) as Record<string, unknown>;
	const tessellation = (r.tessellation ?? {}) as Record<string, unknown>;
	const materialOverrides = (r.materialOverrides ?? {}) as Record<string, unknown>;
	const lod = (r.lod ?? {}) as Record<string, unknown>;
	const overlays = (r.overlays ?? {}) as Record<string, unknown>;
	const proceduralStart = num(lod.proceduralAboveRadiusPx, d.lod.proceduralAboveRadiusPx);
	const proceduralFull = num(lod.proceduralFullRadiusPx, proceduralStart * 1.5);
	const orbitPaths = overlays.orbitPaths;
	return {
		debug: {
			wireframe: !!(debug.wireframe ?? d.debug.wireframe),
			faceColors: !!(debug.faceColors ?? d.debug.faceColors),
			showPatchBorders: !!(debug.showPatchBorders ?? d.debug.showPatchBorders),
			showRingColors: !!(debug.showRingColors ?? d.debug.showRingColors)
		},
		atmosphere: {
			blendMode:
				atmosphere.blendMode === 'hardware-alpha' || atmosphere.blendMode === 'explicit-composite'
					? atmosphere.blendMode
					: d.atmosphere.blendMode
		},
		overlays: {
			showAtmospheres: !!(overlays.showAtmospheres ?? d.overlays.showAtmospheres),
			orbitPaths:
				orbitPaths === 'off' || orbitPaths === 'all' || orbitPaths === 'selected'
					? orbitPaths
					: d.overlays.orbitPaths,
			showEditorAids: overlays.showEditorAids !== false
		},
		tessellation: { ...d.tessellation, ...tessellation } as SceneViewportPrefs['tessellation'],
		materialOverrides: {
			...d.materialOverrides,
			...materialOverrides
		} as SceneViewportPrefs['materialOverrides'],
		atmosphereIntegrateSteps: num(r.atmosphereIntegrateSteps, d.atmosphereIntegrateSteps),
		lod: {
			sphereAboveRadiusPx: num(lod.sphereAboveRadiusPx, d.lod.sphereAboveRadiusPx),
			proceduralAboveRadiusPx: proceduralStart,
			proceduralFullRadiusPx: Math.max(proceduralStart + 1, proceduralFull),
			fadeGamma: num(lod.fadeGamma, d.lod.fadeGamma),
			sphereShrinkPercent: Math.max(
				0,
				Math.min(10, num(lod.sphereShrinkPercent, d.lod.sphereShrinkPercent))
			)
		},
		eclipseContrast: Math.max(0.25, Math.min(4, num(r.eclipseContrast, d.eclipseContrast)))
	};
}

function coerceMaterialDebug(v: unknown): SceneDebugMode {
	return SCENE_DEBUG_LABELS.some((o) => o.value === v) ? (v as SceneDebugMode) : 'off';
}

function coerceLookMode(v: unknown): OrbitLookMode {
	return v === 'horizon' || v === 'planet-center' ? v : 'planet-center';
}

export function coerceSceneViewSettings(raw: unknown): SceneViewSettings {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	return {
		viewportPrefs: coerceViewportPrefs(r.viewportPrefs),
		materialDebug: coerceMaterialDebug(r.materialDebug),
		lookMode: coerceLookMode(r.lookMode)
	};
}

export function loadSceneViewSettings(): SceneViewSettings {
	if (typeof localStorage === 'undefined') return defaultSceneViewSettings();
	try {
		const raw = localStorage.getItem(SCENE_VIEW_SETTINGS_KEY);
		if (!raw) return defaultSceneViewSettings();
		return coerceSceneViewSettings(JSON.parse(raw));
	} catch {
		return defaultSceneViewSettings();
	}
}

export function saveSceneViewSettings(s: SceneViewSettings): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SCENE_VIEW_SETTINGS_KEY, JSON.stringify(s));
	} catch {
		/* private mode / quota — ignore */
	}
}
