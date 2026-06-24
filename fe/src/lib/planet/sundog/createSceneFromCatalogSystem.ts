import type { BodyNode, PlanetScene, SceneNode } from '../scene/types.js';
import { IDENTITY_QUAT } from '../scene/transform.js';
import { makeOrbitingBody } from '../scene/sceneEdit.js';
import { DEFAULT_AMBIENT } from '../scene/defaults.js';
import type { PlanetPresetName } from '../params/presets.js';
import type { AddedBody, BodyEnrichment, OrbitEnrichment } from './enrichmentTypes.js';
import { orbitPlaneRotation } from './orbitPlaneRotation.js';
import type { ResolvedSunDogSystem } from './resolveSystem.js';
import type { SunDogBody, SunDogSystem } from './catalogTypes.js';
import { resolveSystem } from './resolveSystem.js';

// Build a renderable PlanetScene from a SunDog catalog system, reusing the exact
// composable-orbit primitives the toy preset uses (orbit container with a kepler
// driver + inertial frame → phase rotate → radius translate → body). The star
// sits at the system centre; each planet orbits it. Render params map to the
// body (radius, appearance preset); game params stay in the catalog.
// Enrichment overlays eccentricity, inclination, appearance, and authored moons.
// See _docs/specs/sundog-enrichment.md and scene/solarSystem.ts.

/** Scene root id (single active system, matching the /scene route's convention). */
export const SYSTEM_ROOT_ID = 'solar-system';

const AU = 1.495978707e11;
const SUN_RADIUS_M = 6.957e8;
const EARTH_RADIUS_M = 6.371e6;
const SECONDS_PER_GAME_DAY = 1;
const SECONDS_PER_GAME_HOUR = 1;

const FALLBACK_ORBIT_AU = 1;
const FALLBACK_PERIOD_DAYS = 365;
const FALLBACK_SIZE_REL = 1;
const FALLBACK_STAR_RADIUS_SOLAR = 1;

const TERRAIN_PRESET: Record<string, PlanetPresetName> = {
	Terran: 'normie',
	Jungle: 'archipelago',
	Desert: 'desert',
	Ice: 'frozen',
	Regolith: 'craters'
};

/** Map a SunDog terrain class to the closest procedural preset. */
export function terrainToPreset(terrain: string | null): PlanetPresetName {
	if (!terrain) return 'normie';
	return TERRAIN_PRESET[terrain] ?? 'normie';
}

function identityTransform() {
	return { position: [0, 0, 0] as [number, number, number], rotation: IDENTITY_QUAT };
}

function resolveAppearance(
	body: SunDogBody,
	enrichment?: BodyEnrichment
): BodyNode['appearance'] {
	const basePreset = enrichment?.appearance?.preset ?? terrainToPreset(body.render.terrain);
	const overrides = enrichment?.appearance?.overrides;
	if (!overrides) return { preset: basePreset };
	return { preset: basePreset, overrides };
}

function orbitRotation(orbit?: OrbitEnrichment) {
	if (!orbit?.inclinationDeg && !orbit?.ascendingNodeDeg) return IDENTITY_QUAT;
	return orbitPlaneRotation(orbit.inclinationDeg ?? 0, orbit.ascendingNodeDeg ?? 0);
}

function addOrbitingNodes(
	nodes: Map<string, SceneNode>,
	centerId: string,
	bodyId: string,
	name: string,
	opts: {
		bodyType: BodyNode['bodyType'];
		orbitRadiusMeters: number;
		periodSeconds: number;
		phaseAtEpoch: number;
		spinPeriodSeconds: number;
		radiusMeters: number;
		standIn?: boolean;
		appearance?: BodyNode['appearance'];
		orbit?: OrbitEnrichment;
	}
): void {
	const orbit = opts.orbit;
	const [orbitNode, phase, radius, body] = makeOrbitingBody(centerId, {
		nodeIdPrefix: bodyId,
		name,
		bodyType: opts.bodyType,
		orbitRadiusMeters: opts.orbitRadiusMeters,
		periodSeconds: opts.periodSeconds,
		phaseAtEpoch: opts.phaseAtEpoch,
		spinPeriodSeconds: opts.spinPeriodSeconds,
		eccentricity: orbit?.eccentricity ?? 0,
		periapsisAngle: orbit?.periapsisAngle ?? 0,
		orbitRotation: orbitRotation(orbit),
		radiusMeters: opts.radiusMeters,
		standIn: opts.standIn,
		appearance: opts.appearance
	});
	nodes.set(orbitNode.id, orbitNode);
	nodes.set(phase.id, phase);
	nodes.set(radius.id, radius);
	nodes.set(body.id, body);
}

function addCatalogBody(
	nodes: Map<string, SceneNode>,
	body: SunDogBody,
	centerId: string,
	phaseAtEpoch: number,
	enrichment?: BodyEnrichment
): void {
	const orbitRadius = (body.render.orbit.distanceToStarAu ?? FALLBACK_ORBIT_AU) * AU;
	const periodSeconds =
		(body.render.orbit.orbitPeriodDays ?? FALLBACK_PERIOD_DAYS) * SECONDS_PER_GAME_DAY;
	const spinSeconds = (body.render.orbit.dayRotationHours ?? 24) * SECONDS_PER_GAME_HOUR;
	const radiusMeters = (body.render.planetSizeRel ?? FALLBACK_SIZE_REL) * EARTH_RADIUS_M;

	addOrbitingNodes(nodes, centerId, body.id, body.name, {
		bodyType: body.kind === 'moon' ? 'moon' : 'planet',
		orbitRadiusMeters: orbitRadius,
		periodSeconds,
		phaseAtEpoch,
		spinPeriodSeconds: spinSeconds,
		radiusMeters,
		standIn: false,
		appearance: resolveAppearance(body, enrichment),
		orbit: enrichment?.orbit
	});
}

function addAddedBody(
	nodes: Map<string, SceneNode>,
	add: AddedBody,
	starId: string,
	phaseAtEpoch: number
): void {
	const centerId =
		add.parentBodyId === null ? starId : `${add.parentBodyId}-radius`;
	const bodyType = add.kind === 'gas_giant' ? 'gas_giant' : 'moon';
	const appearance = add.render.appearance
		? {
				preset: add.render.appearance.preset ?? 'normie',
				...(add.render.appearance.overrides ? { overrides: add.render.appearance.overrides } : {})
			}
		: add.kind === 'gas_giant'
			? undefined
			: { preset: 'craters' as PlanetPresetName };

	addOrbitingNodes(nodes, centerId, add.id, add.name, {
		bodyType,
		orbitRadiusMeters: add.render.orbitRadiusMeters,
		periodSeconds: add.render.periodSeconds,
		phaseAtEpoch: add.render.phaseAtEpoch ?? phaseAtEpoch,
		spinPeriodSeconds: add.render.spinPeriodSeconds ?? 24,
		radiusMeters: add.render.radiusMeters,
		standIn: add.render.standIn ?? add.kind === 'gas_giant',
		appearance,
		orbit: {
			eccentricity: add.render.eccentricity,
			periapsisAngle: add.render.periapsisAngle,
			inclinationDeg: add.render.inclinationDeg,
			ascendingNodeDeg: add.render.ascendingNodeDeg
		}
	});
}

function buildSceneFromResolved(resolved: ResolvedSunDogSystem): PlanetScene {
	const system = resolved.extracted;
	const nodes = new Map<string, SceneNode>();
	const add = (n: SceneNode) => nodes.set(n.id, n);
	const starId = `${system.id}-star`;

	add({
		id: SYSTEM_ROOT_ID,
		name: `${system.name} System`,
		parentId: null,
		kind: 'group',
		enabled: true,
		transform: identityTransform()
	});
	add({
		id: 'ss-ambient',
		name: 'Ambient',
		parentId: SYSTEM_ROOT_ID,
		kind: 'ambient_light',
		enabled: true,
		transform: identityTransform(),
		color: [...DEFAULT_AMBIENT],
		intensity: 1
	});

	add({
		id: starId,
		name: system.name,
		parentId: SYSTEM_ROOT_ID,
		kind: 'body',
		enabled: true,
		transform: identityTransform(),
		bodyType: 'star',
		radiusMeters: (system.star.radiusSolar ?? FALLBACK_STAR_RADIUS_SOLAR) * SUN_RADIUS_M,
		standIn: true
	} as BodyNode);
	add({
		id: 'ss-starlight',
		name: 'Starlight',
		parentId: starId,
		kind: 'point_light',
		enabled: true,
		transform: identityTransform(),
		color: [1.0, 0.95, 0.85],
		intensity: 3.5,
		range: 1e13,
		affects: null
	});

	const n = system.bodies.length;
	system.bodies.forEach((body, i) => {
		const phase = n > 0 ? (i / n) * Math.PI * 2 : 0;
		addCatalogBody(nodes, body, starId, phase, resolved.bodyEnrichments.get(body.id));
	});

	const additionPhase = (i: number) => ((i + 1) / (system.bodies.length + 1)) * Math.PI * 2;
	for (const [i, addition] of (resolved.enrichment?.additions ?? []).entries()) {
		addAddedBody(nodes, addition, starId, additionPhase(i));
	}

	return { rootId: SYSTEM_ROOT_ID, nodes };
}

/** Build a single-system PlanetScene from extracted catalog (no enrichment). */
export function createSceneFromCatalogSystem(system: SunDogSystem): PlanetScene {
	const resolved = resolveSystem(system.id);
	if (resolved) return buildSceneFromResolved(resolved);
	return buildSceneFromResolved({
		extracted: system,
		bodyEnrichments: new Map()
	});
}

/** Build scene from resolved system (extracted + enrichment). */
export function createSceneFromResolvedSystem(resolved: ResolvedSunDogSystem): PlanetScene {
	return buildSceneFromResolved(resolved);
}
