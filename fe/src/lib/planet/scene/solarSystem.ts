import type { BodyType, PlanetScene, SceneNode } from './types.js';
import { IDENTITY_QUAT } from './transform.js';
import { DEFAULT_AMBIENT } from './defaults.js';

// Toy solar system preset. Small bodies: rocky planets 400-600 km radius (~1/12
// Earth). Each orbit is built from single-purpose nodes (no per-channel inheritance):
//
//   <body>-phase   group, orbitPhase driver → rotation about +Y (center of rotation)
//     <body>-radius  group, transform.position = [R,0,0] (the orbital distance)
//       <body>       the body — spins only, sits at the orbital position
//
// The phase rotation sweeps the radius offset around a circle = the orbit. A planet's
// radius node is the "system center": the planet sits there and its moons' phase
// nodes are children of it, so moon-orbit and planet-spin are independent (siblings).
// Orbits are circular for now. See _docs/specs/solar-system-scene.md.

const KM = 1000; // meters per kilometer

export const TOY_SOLAR_SYSTEM_ROOT_ID = 'solar-system';

export function createToySolarSystemScene(): PlanetScene {
	const nodes = new Map<string, SceneNode>();
	const add = (node: SceneNode) => nodes.set(node.id, node);
	const id = (rotation = IDENTITY_QUAT) => ({ position: [0, 0, 0] as [number, number, number], rotation });

	/**
	 * Build an orbiting body: phase (rotation) → radius (distance) → body (spin),
	 * orbiting `centerId`. Returns the radius node id — the body's system center,
	 * where its moons attach. The body node keeps `id` (so ids stay stable).
	 */
	const orbiting = (
		bodyId: string,
		name: string,
		centerId: string,
		bodyType: BodyType,
		radiusKm: number,
		orbitRadiusKm: number,
		periodSeconds: number,
		phaseAtEpoch: number,
		spinPeriodSeconds: number,
		standIn = false
	): string => {
		add({
			id: `${bodyId}-phase`,
			name: `${name} orbit`,
			parentId: centerId,
			kind: 'group',
			enabled: true,
			transform: id(),
			orbitPhase: { periodSeconds, phaseAtEpoch }
		});
		add({
			id: `${bodyId}-radius`,
			name: `${name} radius`,
			parentId: `${bodyId}-phase`,
			kind: 'group',
			enabled: true,
			transform: { position: [orbitRadiusKm * KM, 0, 0], rotation: IDENTITY_QUAT }
		});
		add({
			id: bodyId,
			name,
			parentId: `${bodyId}-radius`,
			kind: 'body',
			enabled: true,
			transform: id(),
			bodyType,
			radiusMeters: radiusKm * KM,
			standIn,
			spinPeriodSeconds
		});
		return `${bodyId}-radius`;
	};

	/** Disabled placeholder for a moon's future reflected light, scoped to its planet. */
	const reflection = (id_: string, name: string, moonId: string, planetId: string) =>
		add({
			id: id_,
			name,
			parentId: moonId,
			kind: 'directional_light',
			enabled: false,
			transform: id(),
			color: [0.7, 0.72, 0.8],
			intensity: 0.1,
			affects: planetId
		});

	add({
		id: TOY_SOLAR_SYSTEM_ROOT_ID,
		name: 'Solar System',
		parentId: null,
		kind: 'group',
		enabled: true,
		transform: id()
	});
	add({
		id: 'ss-ambient',
		name: 'Ambient',
		parentId: TOY_SOLAR_SYSTEM_ROOT_ID,
		kind: 'ambient_light',
		enabled: true,
		transform: id(),
		color: [...DEFAULT_AMBIENT],
		intensity: 1
	});
	add({
		id: 'ss-starlight',
		name: 'Starlight',
		parentId: TOY_SOLAR_SYSTEM_ROOT_ID,
		kind: 'directional_light',
		enabled: true,
		transform: id(),
		color: [1.0, 0.95, 0.85],
		intensity: 3.5,
		affects: null
	});

	// Star at the system center (stand-in — no star designer facilities yet).
	add({
		id: 'ss-sol',
		name: 'Sol',
		parentId: TOY_SOLAR_SYSTEM_ROOT_ID,
		kind: 'body',
		enabled: true,
		transform: id(),
		bodyType: 'star',
		radiusMeters: 50_000 * KM,
		standIn: true
	});

	// Planets orbit Sol; moons orbit their planet's radius node (the system center).
	orbiting('ss-ferro', 'Ferro', 'ss-sol', 'planet', 500, 10_000, 60, 0, 12);
	orbiting('ss-luna-f', 'Luna-F', 'ss-ferro-radius', 'moon', 120, 600, 9, 0.5, 9);
	reflection('ss-luna-f-reflect', 'Luna-F reflection', 'ss-luna-f', 'ss-ferro');

	orbiting('ss-cerule', 'Cerule', 'ss-sol', 'planet', 450, 20_000, 170, 2.1, 18);

	orbiting('ss-ochre', 'Ochre', 'ss-sol', 'planet', 600, 35_000, 393, 4.2, 24);
	orbiting('ss-pebble', 'Pebble', 'ss-ochre-radius', 'moon', 90, 700, 11, 0, 11);
	reflection('ss-pebble-reflect', 'Pebble reflection', 'ss-pebble', 'ss-ochre');
	orbiting('ss-cobble', 'Cobble', 'ss-ochre-radius', 'moon', 70, 1_100, 20, 3.1, 20);

	orbiting('ss-tempest', 'Tempest', 'ss-sol', 'gas_giant', 7_000, 60_000, 882, 1.0, 30, true);
	orbiting('ss-gale', 'Gale', 'ss-tempest-radius', 'moon', 200, 9_000, 40, 0, 40);
	reflection('ss-gale-reflect', 'Gale reflection', 'ss-gale', 'ss-tempest');

	return { rootId: TOY_SOLAR_SYSTEM_ROOT_ID, nodes };
}
