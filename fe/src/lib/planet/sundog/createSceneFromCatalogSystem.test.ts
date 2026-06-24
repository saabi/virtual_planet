import { describe, expect, it } from 'vitest';
import { getSystem } from './catalog.js';
import {
	createSceneFromCatalogSystem,
	SUNDog_SCENE_MOTION_TIME_SCALE,
	SYSTEM_ROOT_ID,
	terrainToPreset
} from './createSceneFromCatalogSystem.js';
import { resolveSystem } from './resolveSystem.js';
import { collectOrbitPathSpecs } from '../scene/orbitPaths.js';
import { findOwnerBody, getWorldTransform, listBodies } from '../scene/sceneTree.js';
import { advanceScene } from '../scene/orbit.js';
import { evaluateScene } from '../scene/driver.js';
import { serializeScene, deserializeScene } from '../scene/sceneDocument.js';
import { IDENTITY_QUAT } from '../scene/transform.js';
import type { KeplerDriver } from '../scene/types.js';

const jondd = () => {
	const s = getSystem('jondd');
	if (!s) throw new Error('jondd missing from catalog');
	return s;
};

function keplerDriver(scene: ReturnType<typeof createSceneFromCatalogSystem>, orbitId: string): KeplerDriver {
	const node = scene.nodes.get(orbitId);
	expect(node?.driver?.type).toBe('kepler');
	return node!.driver as KeplerDriver;
}

describe('terrainToPreset', () => {
	it('maps known SunDog terrains and falls back to normie', () => {
		expect(terrainToPreset('Desert')).toBe('desert');
		expect(terrainToPreset('Ice')).toBe('frozen');
		expect(terrainToPreset('Regolith')).toBe('craters');
		expect(terrainToPreset('Terran')).toBe('normie');
		expect(terrainToPreset(null)).toBe('normie');
		expect(terrainToPreset('Unknown')).toBe('normie');
	});
});

describe('createSceneFromCatalogSystem', () => {
	it('builds a scene with a central star and one body per catalog planet', () => {
		const system = jondd();
		const scene = createSceneFromCatalogSystem(system);
		expect(scene.rootId).toBe(SYSTEM_ROOT_ID);

		const bodies = listBodies(scene);
		const stars = bodies.filter((b) => b.bodyType === 'star');
		const planets = bodies.filter((b) => b.bodyType === 'planet');
		expect(stars).toHaveLength(1);
		expect(planets).toHaveLength(system.bodies.length);
		expect(stars[0]!.name).toBe(system.name);
		expect(stars[0]!.standIn).toBe(true);
	});

	it('parents each planet orbit on the star (ownership = the star)', () => {
		const system = jondd();
		const scene = createSceneFromCatalogSystem(system);
		const starId = `${system.id}-star`;
		for (const body of system.bodies) {
			const owner = findOwnerBody(scene, body.id);
			expect(owner?.id, body.id).toBe(starId);
		}
	});

	it('maps terrain to an appearance preset', () => {
		const scene = createSceneFromCatalogSystem(jondd());
		const homeworld = scene.nodes.get('jondd');
		expect(homeworld?.kind).toBe('body');
		if (homeworld?.kind === 'body') {
			expect(homeworld.appearance?.preset).toBe('normie'); // Jondd is Terran
		}
	});

	it('animates deterministically: same time → same world positions', () => {
		const scene = createSceneFromCatalogSystem(jondd());
		const worldPos = (t: number) => getWorldTransform(evaluateScene(scene, t), 'jondd').position;
		expect(worldPos(12.5)).toEqual(worldPos(12.5));
		expect(worldPos(12.5)).not.toEqual(worldPos(40));
	});

	it('round-trips through scene serialization', () => {
		const scene = createSceneFromCatalogSystem(jondd());
		const restored = deserializeScene(serializeScene(scene));
		expect(restored).not.toBeNull();
		expect(restored!.rootId).toBe(SYSTEM_ROOT_ID);
		expect(restored!.nodes.size).toBe(scene.nodes.size);
	});

	it('advanceScene does not throw on the built scene', () => {
		const scene = createSceneFromCatalogSystem(jondd());
		expect(() => advanceScene(scene, 1)).not.toThrow();
	});

	it('scales orbit and spin periods for slower motion without changing distances', () => {
		const system = jondd();
		const scene = createSceneFromCatalogSystem(system);
		const body = system.bodies[0]!;
		const au = 1.495978707e11;
		const catalogPeriod =
			(body.render.orbit.orbitPeriodDays ?? 365);
		const driver = keplerDriver(scene, `${body.id}-orbit`);
		expect(driver.periodSeconds).toBe(catalogPeriod * SUNDog_SCENE_MOTION_TIME_SCALE);
		expect(driver.semiMajorAxis).toBeCloseTo(
			(body.render.orbit.distanceToStarAu ?? 1) * au
		);
		const planet = scene.nodes.get(body.id);
		expect(planet?.kind).toBe('body');
		if (planet?.kind === 'body') {
			const spinHours = body.render.orbit.dayRotationHours ?? 24;
			expect(planet.spinPeriodSeconds).toBe(spinHours * SUNDog_SCENE_MOTION_TIME_SCALE);
		}
	});

	it('applies enrichment eccentricity and distinct periapsis on Glory', () => {
		const glory = getSystem('glory')!;
		const scene = createSceneFromCatalogSystem(glory);
		const d0 = keplerDriver(scene, 'glory-i-orbit');
		const d1 = keplerDriver(scene, 'glory-ii-orbit');
		const d2 = keplerDriver(scene, 'glory-iii-orbit');
		expect(d2.eccentricity).toBeCloseTo(0.14);
		expect(d0.periapsisAngle).not.toBeCloseTo(d1.periapsisAngle);
		expect(d1.periapsisAngle).not.toBeCloseTo(d2.periapsisAngle);
	});

	it('applies inclination on kepler-orbit group transforms', () => {
		const glory = getSystem('glory')!;
		const scene = createSceneFromCatalogSystem(glory);
		const orbitI = scene.nodes.get('glory-i-orbit')!;
		const orbitIII = scene.nodes.get('glory-iii-orbit')!;
		expect(orbitIII.transform.rotation).not.toEqual(IDENTITY_QUAT);
		expect(orbitI.transform.rotation).not.toEqual(orbitIII.transform.rotation);
	});

	it('includes authored moon for Glory III', () => {
		const glory = getSystem('glory')!;
		const scene = createSceneFromCatalogSystem(glory);
		expect(scene.nodes.has('glory-iii-moon')).toBe(true);
		const owner = findOwnerBody(scene, 'glory-iii-moon');
		expect(owner?.id).toBe('glory-iii');
	});

	it('collectOrbitPathSpecs yields distinct frames for Glory planets', () => {
		const resolved = resolveSystem('glory')!;
		const scene = evaluateScene(createSceneFromCatalogSystem(resolved.extracted), 0);
		const specs = collectOrbitPathSpecs(scene);
		const glorySpecs = specs.filter((s) => s.keplerNodeId.startsWith('glory-'));
		expect(glorySpecs.length).toBeGreaterThanOrEqual(3);
		const rots = glorySpecs.map((s) => s.frame.rotation.join(','));
		expect(new Set(rots).size).toBeGreaterThan(1);
	});
});
