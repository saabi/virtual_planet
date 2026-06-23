import { describe, expect, it } from 'vitest';
import { applyParamsToSceneJson } from './planetHandoff.js';
import { createToySolarSystemScene } from './solarSystem.js';
import { deserializeScene, serializeScene } from './sceneDocument.js';
import { resolveBodyParams } from './bodyParams.js';
import { PLANET_PRESETS } from '../params/presets.js';
import type { BodyNode, PlanetScene } from './types.js';

function firstPlanet(scene: PlanetScene): BodyNode {
	for (const n of scene.nodes.values()) {
		if (n.kind === 'body' && (n.bodyType === 'planet' || n.bodyType === 'moon')) return n;
	}
	throw new Error('toy scene has no planet/moon body');
}

describe('applyParamsToSceneJson (scene save-back)', () => {
	const scene = createToySolarSystemScene();
	const planet = firstPlanet(scene);
	const json = serializeScene(scene);

	it('writes the sparse override diff into the body appearance', () => {
		const edited = { ...PLANET_PRESETS.desert, water_level: 0.2, voronoi_distortion_scale: 6 };
		const next = applyParamsToSceneJson(json, planet.id, 'desert', edited);
		expect(next).not.toBeNull();
		const node = deserializeScene(next!)!.nodes.get(planet.id) as BodyNode;
		expect(node.appearance?.preset).toBe('desert');
		expect(node.appearance?.overrides).toEqual({ water_level: 0.2, voronoi_distortion_scale: 6 });
		expect(resolveBodyParams(node)).toEqual(edited); // resolves back to the edits
	});

	it('leaves the rest of the tree intact', () => {
		const next = applyParamsToSceneJson(json, planet.id, 'desert', { ...PLANET_PRESETS.desert })!;
		const reloaded = deserializeScene(next)!;
		expect(reloaded.nodes.size).toBe(scene.nodes.size);
		expect(reloaded.rootId).toBe(scene.rootId);
	});

	it('writes atmosphere onto the body when provided', () => {
		const atmosphere = {
			enabled: true,
			shellHeightMeters: 100000,
			scaleHeightMeters: 50000,
			rayleighStrength: 0.4,
			mieStrength: 0.2,
			mieG: 0.7,
			groundFogDensity: 0.3,
			sunDiskIntensity: 25
		};
		const next = applyParamsToSceneJson(json, planet.id, 'desert', PLANET_PRESETS.desert, atmosphere)!;
		const node = deserializeScene(next)!.nodes.get(planet.id) as BodyNode;
		expect(node.atmosphere).toEqual(atmosphere);
	});

	it('returns null for a missing id', () => {
		expect(applyParamsToSceneJson(json, 'nope', 'desert', PLANET_PRESETS.desert)).toBeNull();
	});
});
