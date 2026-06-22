import type { PlanetParameters } from '../params/planetParams.js';
import type { PlanetPresetName } from '../params/presets.js';
import { deserializeScene, serializeScene } from './sceneDocument.js';
import { getNode } from './sceneTree.js';
import { diffAppearanceOverrides } from './bodyParams.js';

// Round-trip handoff between /scene and /planet. /scene writes /planet's session with a
// body's resolved params (so PlanetViewport hydrates them as usual) plus this persistent
// "link" record; /planet reads the link to offer "Save to scene", which writes the edited
// params back into the body's appearance.overrides. See _docs/specs/celestial-body-params.md
// and the renderer-unification plan. Atmosphere is not yet body data, so only shape/material
// params round-trip for now.

const HANDOFF_KEY = 'vp.scenePlanetHandoff';
const SCENE_KEY = 'vp.systemScene';

export interface ScenePlanetHandoff {
	bodyId: string;
	bodyName: string;
	presetName: PlanetPresetName;
	/** The /scene URL the body was opened from (for "return to scene"). */
	scenePath: string;
}

function hasLocalStorage(): boolean {
	try {
		return typeof localStorage !== 'undefined';
	} catch {
		return false;
	}
}

export function writeHandoffLink(link: ScenePlanetHandoff): void {
	if (!hasLocalStorage()) return;
	try {
		localStorage.setItem(HANDOFF_KEY, JSON.stringify(link));
	} catch {
		/* private mode / quota — handoff is best-effort */
	}
}

export function readHandoffLink(): ScenePlanetHandoff | null {
	if (!hasLocalStorage()) return null;
	try {
		const raw = localStorage.getItem(HANDOFF_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as Partial<ScenePlanetHandoff>;
		if (typeof p.bodyId !== 'string' || typeof p.presetName !== 'string') return null;
		return {
			bodyId: p.bodyId,
			bodyName: typeof p.bodyName === 'string' ? p.bodyName : p.bodyId,
			presetName: p.presetName as PlanetPresetName,
			scenePath: typeof p.scenePath === 'string' ? p.scenePath : '/scene'
		};
	} catch {
		return null;
	}
}

export function clearHandoffLink(): void {
	if (!hasLocalStorage()) return;
	try {
		localStorage.removeItem(HANDOFF_KEY);
	} catch {
		/* ignore */
	}
}

/**
 * Pure: write `params` into the body's appearance (as a sparse diff vs `preset`) in a
 * serialized scene, returning the new serialized scene. Returns null if the scene is
 * malformed or `bodyId` is not a body node. Pure so the save-back round-trip is
 * unit-testable without localStorage.
 */
export function applyParamsToSceneJson(
	sceneJson: string,
	bodyId: string,
	preset: PlanetPresetName,
	params: PlanetParameters
): string | null {
	const scene = deserializeScene(sceneJson);
	if (!scene) return null;
	const node = getNode(scene, bodyId);
	if (!node || node.kind !== 'body') return null;
	node.appearance = { preset, overrides: diffAppearanceOverrides(params, preset) };
	return serializeScene(scene);
}

/** localStorage wrapper around {@link applyParamsToSceneJson}. True on success. */
export function saveParamsToSceneBody(
	bodyId: string,
	preset: PlanetPresetName,
	params: PlanetParameters
): boolean {
	if (!hasLocalStorage()) return false;
	try {
		const json = localStorage.getItem(SCENE_KEY);
		if (!json) return false;
		const next = applyParamsToSceneJson(json, bodyId, preset, params);
		if (!next) return false;
		localStorage.setItem(SCENE_KEY, next);
		return true;
	} catch {
		return false;
	}
}
