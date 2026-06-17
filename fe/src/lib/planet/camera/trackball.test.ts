import { describe, expect, it } from 'vitest';
import { createOrbitCamera, quatFromAzimuthElevation } from './orbitCamera.js';
import { quatFromAxisAngle, quatMultiply, rotateVec3 } from '../scene/transform.js';
import { cross3, normalize3 } from '../math/vec.js';
import type { Vec3 } from '../math/vec.js';

describe('Trackball drag simulation with unified axes', () => {
	it('tests horizon mode drag responses', () => {
		const cameraDistance = 320;
		const params = { radius: 100 };
		const cameraRotation = quatFromAzimuthElevation(0.6, 0.35);

		const camera = createOrbitCamera({
			distance: cameraDistance,
			azimuth: 0.6,
			elevation: 0.35,
			fovDeg: 60,
			aspect: 1,
			near: 0.1,
			far: 10_000,
			planetRadius: params.radius,
			lookMode: 'horizon',
			cameraRotation
		});

		const vm = camera.viewMatrix;
		const s: Vec3 = [vm[0], vm[4], vm[8]];
		const outward = normalize3(camera.position);

		const axisYaw = normalize3(cross3(outward, s));
		const axisPitch = s;

		const dx = 100;
		const dy = 100;
		const sensitivity = 0.005;

		// Horizontal drag should move the camera position in the plane perpendicular to axisYaw
		const qYaw = quatFromAxisAngle(axisYaw, -dx * sensitivity);
		const rotAfterDx = quatMultiply(qYaw, cameraRotation);
		const posAfterDx = rotateVec3(rotAfterDx, [cameraDistance, 0, 0]);

		// Verify distance is preserved
		const distAfterDx = Math.hypot(posAfterDx[0], posAfterDx[1], posAfterDx[2]);
		expect(distAfterDx).toBeCloseTo(cameraDistance, 4);

		// Vertical drag should move the camera position in the plane perpendicular to axisPitch
		const qPitch = quatFromAxisAngle(axisPitch, -dy * sensitivity);
		const rotAfterDy = quatMultiply(qPitch, cameraRotation);
		const posAfterDy = rotateVec3(rotAfterDy, [cameraDistance, 0, 0]);

		// Verify distance is preserved
		const distAfterDy = Math.hypot(posAfterDy[0], posAfterDy[1], posAfterDy[2]);
		expect(distAfterDy).toBeCloseTo(cameraDistance, 4);
	});

	it('tests planet-center mode drag responses', () => {
		const cameraDistance = 320;
		const params = { radius: 100 };
		const cameraRotation = quatFromAzimuthElevation(0.6, 0.35);

		const camera = createOrbitCamera({
			distance: cameraDistance,
			azimuth: 0.6,
			elevation: 0.35,
			fovDeg: 60,
			aspect: 1,
			near: 0.1,
			far: 10_000,
			planetRadius: params.radius,
			lookMode: 'planet-center',
			cameraRotation
		});

		const vm = camera.viewMatrix;
		const s: Vec3 = [vm[0], vm[4], vm[8]];
		const outward = normalize3(camera.position);

		const axisYaw = normalize3(cross3(outward, s));
		const axisPitch = s;

		const dx = 100;
		const dy = 100;
		const sensitivity = 0.005;

		// Horizontal drag in planet-center mode should keep elevation/Y mostly stable and orbit horizontally
		const qYaw = quatFromAxisAngle(axisYaw, -dx * sensitivity);
		const rotAfterDx = quatMultiply(qYaw, cameraRotation);
		const posAfterDx = rotateVec3(rotAfterDx, [cameraDistance, 0, 0]);

		// Y should be close to initial Y compared to the overall horizontal sweep
		expect(Math.abs(posAfterDx[1] - camera.position[1])).toBeLessThan(30);

		// Vertical drag in planet-center mode should keep azimuth/lon stable and orbit vertically
		const qPitch = quatFromAxisAngle(axisPitch, -dy * sensitivity);
		const rotAfterDy = quatMultiply(qPitch, cameraRotation);
		const posAfterDy = rotateVec3(rotAfterDy, [cameraDistance, 0, 0]);

		const initialAz = Math.atan2(camera.position[2], camera.position[0]);
		const finalAz = Math.atan2(posAfterDy[2], posAfterDy[0]);
		expect(finalAz).toBeCloseTo(initialAz, 4);
	});
});
