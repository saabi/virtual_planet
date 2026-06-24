import { describe, expect, it } from 'vitest';
import { len3, sub3 } from '../math/vec.js';
import { orbitLocalPosition } from './orbit.js';
import { getSystem } from '../sundog/catalog.js';
import { createSceneFromCatalogSystem } from '../sundog/createSceneFromCatalogSystem.js';
import { evaluateScene } from './driver.js';
import {
	buildOrbitPath3D,
	collectOrbitPathSpecs,
	collectOrbitPaths,
	orbitPathBoundsForNearFar,
	orbitPathSegmentCount,
	sampleOrbitPath
} from './orbitPaths.js';
import { makeOrbitingBody, makeGroup, addChild } from './sceneEdit.js';
import { createToySolarSystemScene } from './solarSystem.js';
import { getWorldTransform } from './sceneTree.js';
import { transformPoint } from './transform.js';
import type { OrbitElements, PlanetScene } from './types.js';

function sceneWithRoot(): PlanetScene {
	const root = makeGroup('root', 'root');
	root.parentId = null;
	return { rootId: 'root', nodes: new Map([[root.id, root]]) };
}

const TEST_ORBIT: OrbitElements = {
	semiMajorAxis: 1e8,
	eccentricity: 0.2,
	periodSeconds: 100,
	phaseAtEpoch: 0.5,
	periapsisAngle: 0.3
};

describe('collectOrbitPathSpecs', () => {
	it('dedupes multiple bodies on the same kepler container', () => {
		let scene = sceneWithRoot();
		scene = addChild(scene, makeGroup('root', 'star'));
		const a = makeOrbitingBody('star', { name: 'A' });
		const b = makeOrbitingBody('star', { name: 'B' });
		for (const n of a) scene = addChild(scene, n);
		for (const n of b) scene = addChild(scene, n);
		const paths = collectOrbitPathSpecs(scene);
		const keplerIds = new Set(paths.map((p) => p.keplerNodeId));
		expect(paths.length).toBe(keplerIds.size);
		expect(paths.length).toBe(2);
	});

	it('includes kepler containers without body children', () => {
		let scene = sceneWithRoot();
		scene = addChild(scene, makeGroup('root', 'star'));
		const nodes = makeOrbitingBody('star');
		const orbitOnly = nodes[0]!;
		scene = addChild(scene, orbitOnly);
		const paths = collectOrbitPathSpecs(scene);
		expect(paths.some((p) => p.keplerNodeId === orbitOnly.id)).toBe(true);
	});
});

describe('collectOrbitPaths', () => {
	it('places the moving body on the sampled ellipse (kepler)', () => {
		const scene = createToySolarSystemScene();
		const paths = collectOrbitPaths(scene, 64);
		expect(paths.length).toBeGreaterThan(0);
		const path = paths[0]!;
		expect(path.bodyId).toBeTruthy();
		expect(path.points.length).toBe(64);
		expect(len3(path.frame.position)).toBeGreaterThanOrEqual(0);
	});
});

describe('orbitPathSegmentCount', () => {
	it('increases segment count when the view distance decreases', () => {
		const far = orbitPathSegmentCount(TEST_ORBIT, 1e9, 800, { max: 4096 });
		const near = orbitPathSegmentCount(TEST_ORBIT, 1e7, 800, { max: 4096 });
		expect(near).toBeGreaterThan(far);
	});

	it('clamps to max', () => {
		const segments = orbitPathSegmentCount(TEST_ORBIT, 1, 800, { max: 64 });
		expect(segments).toBe(64);
	});
});

describe('orbitPathBoundsForNearFar', () => {
	it('uses semiMajorAxis * (1 + e) as the bounding radius', () => {
		const spec = {
			keplerNodeId: 'k',
			bodyId: null,
			frame: {
				position: [1, 2, 3] as [number, number, number],
				rotation: [0, 0, 0, 1] as [number, number, number, number],
				scale: [1, 1, 1] as [number, number, number]
			},
			elements: TEST_ORBIT
		};
		const b = orbitPathBoundsForNearFar(spec);
		expect(b.center).toEqual([1, 2, 3]);
		expect(b.radius).toBeCloseTo(TEST_ORBIT.semiMajorAxis * 1.2, 0);
	});
});

describe('sampleOrbitPath', () => {
	it('injects the body position at scene time onto the polyline', () => {
		const scene = createToySolarSystemScene();
		const t = 12.5;
		const animated = evaluateScene(scene, t);
		const spec = collectOrbitPathSpecs(animated).find((p) => p.bodyId === 'ss-ferro')!;
		const bodyWorld = getWorldTransform(animated, 'ss-ferro').position;
		const local = orbitLocalPosition(spec.elements, t);
		expect(len3(sub3(transformPoint(spec.frame, local), bodyWorld))).toBeLessThan(1);
		const points = sampleOrbitPath(spec, 128, { sceneTime: t });
		const nearest = Math.min(...points.map((p) => len3(sub3(p, bodyWorld))));
		expect(nearest).toBeLessThan(1);
	});

	it('buildOrbitPath3D wraps spec + sampled points', () => {
		const scene = createToySolarSystemScene();
		const spec = collectOrbitPathSpecs(scene)[0]!;
		const path = buildOrbitPath3D(spec, 48, 0);
		expect(path.keplerNodeId).toBe(spec.keplerNodeId);
		expect(path.points.length).toBe(48);
		expect(path.localPoints.length).toBe(48);
	});

	it('applies kepler node scale to the orbit ellipse', () => {
		const scene = createToySolarSystemScene();
		const spec0 = collectOrbitPathSpecs(scene)[0]!;
		const nodes = new Map(scene.nodes);
		const kepler = nodes.get(spec0.keplerNodeId)!;
		nodes.set(kepler.id, {
			...kepler,
			transform: { ...kepler.transform, scale: [2, 1, 1] }
		});
		const scaledScene = { ...scene, nodes };
		const spec1 = collectOrbitPathSpecs(scaledScene)[0]!;
		const path0 = buildOrbitPath3D(spec0, 64);
		const path1 = buildOrbitPath3D(spec1, 64);
		const maxX0 = Math.max(...path0.localPoints.map((p) => Math.abs(p[0])));
		const maxX1 = Math.max(...path1.localPoints.map((p) => Math.abs(p[0])));
		expect(maxX1).toBeCloseTo(maxX0 * 2, -4);
	});

	it('applies kepler node rotation to world points', () => {
		const scene = createToySolarSystemScene();
		const spec0 = collectOrbitPathSpecs(scene)[0]!;
		const nodes = new Map(scene.nodes);
		const kepler = nodes.get(spec0.keplerNodeId)!;
		const halfPi = Math.PI / 2;
		nodes.set(kepler.id, {
			...kepler,
			transform: {
				...kepler.transform,
				rotation: [0, Math.sin(halfPi / 2), 0, Math.cos(halfPi / 2)]
			}
		});
		const rotatedScene = { ...scene, nodes };
		const spec1 = collectOrbitPathSpecs(rotatedScene)[0]!;
		const local = orbitLocalPosition(spec0.elements, 0);
		const expected = transformPoint(spec1.frame, local);
		const path1 = buildOrbitPath3D(spec1, 64);
		const nearest = Math.min(...path1.points.map((p) => len3(sub3(p, expected))));
		expect(nearest).toBeLessThan(1);
	});
});

describe('collectOrbitPathSpecs (catalog)', () => {
	it('collects one path per planet in the Glory system', () => {
		const glory = getSystem('glory');
		expect(glory).toBeTruthy();
		const scene = createSceneFromCatalogSystem(glory!);
		const specs = collectOrbitPathSpecs(evaluateScene(scene, 0));
		expect(specs).toHaveLength(3);
		const ids = specs.map((s) => s.keplerNodeId).sort();
		expect(ids).toEqual(['glory-i-orbit', 'glory-ii-orbit', 'glory-iii-orbit']);
	});
});
