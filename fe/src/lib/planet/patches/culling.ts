import type { Vec3 } from '../math/vec.js';
import { dot3, len3, normalize3 } from '../math/vec.js';
import { cubeFaceUvToUnitDir } from './cubeSphere.js';
import type { CubeSpherePatch } from './types.js';

export interface FrustumPlanes {
	planes: Vec3[]; // normal xyz + distance in w stored separately
	dists: number[];
}

export function extractFrustumPlanes(viewProj: Float32Array): FrustumPlanes {
	const planes: Vec3[] = [];
	const dists: number[] = [];
	const m = viewProj;
	const combos = [
		[m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
		[m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
		[m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
		[m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
		[m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
		[m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]]
	];
	for (const p of combos) {
		const l = Math.hypot(p[0], p[1], p[2]);
		planes.push([p[0] / l, p[1] / l, p[2] / l]);
		dists.push(p[3] / l);
	}
	return { planes, dists };
}

function sphereInFrustum(
	center: Vec3,
	radius: number,
	frustum: FrustumPlanes
): boolean {
	for (let i = 0; i < 6; i++) {
		const d = dot3(frustum.planes[i], center) + frustum.dists[i];
		if (d < -radius) return false;
	}
	return true;
}

/** Cull patches behind planet horizon relative to camera. */
export function cullCubeSpherePatches(
	patches: CubeSpherePatch[],
	cameraPos: Vec3,
	planetRadius: number,
	viewProj: Float32Array
): CubeSpherePatch[] {
	const frustum = extractFrustumPlanes(viewProj);
	const camLen = len3(cameraPos);
	const altRatio = Math.max(camLen - planetRadius, 0) / Math.max(planetRadius, 1);
	// When close, limb patches are screen-large — keep a wider visible band than at orbit altitude.
	const backfaceDot = altRatio < 0.3 ? -0.2 : altRatio < 1 ? -0.05 : 0.02;
	const horizonDot = altRatio < 1 ? -0.05 : 0.08;
	const frustumPad = planetRadius * (altRatio < 0.3 ? 0.35 : altRatio < 1 ? 0.15 : 0.05);
	const useHorizonCull = camLen > planetRadius * 1.5 && altRatio >= 1;

	return patches.filter((patch) => {
		const u = (patch.uvMin[0] + patch.uvMax[0]) * 0.5;
		const v = (patch.uvMin[1] + patch.uvMax[1]) * 0.5;
		const dir = cubeFaceUvToUnitDir(patch.face, u, v);
		const center: Vec3 = [
			dir[0] * planetRadius,
			dir[1] * planetRadius,
			dir[2] * planetRadius
		];
		const camDir = normalize3(cameraPos);
		if (dot3(dir, camDir) < backfaceDot) return false;
		const patchRadius =
			planetRadius * 0.5 * Math.hypot(patch.uvMax[0] - patch.uvMin[0], patch.uvMax[1] - patch.uvMin[1]);
		if (!sphereInFrustum(center, patchRadius + frustumPad, frustum)) return false;
		if (useHorizonCull && dot3(dir, camDir) < horizonDot) return false;
		return true;
	});
}
