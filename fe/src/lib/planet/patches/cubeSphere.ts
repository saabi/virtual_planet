import type { Vec3 } from '../math/vec.js';
import { normalize3 } from '../math/vec.js';
import { cullCubeSpherePatches } from './culling.js';
import type { CubeSpherePatch } from './types.js';

/** Vertices per instanced cube patch (two triangles per grid cell). */
export function cubePatchVertexCount(resolution: number): number {
	const res = Math.max(1, Math.floor(resolution));
	return res * res * 6;
}

export function chooseOrbitFacesPerSide(altitudeMeters: number, planetRadius: number): number {
	const altRatio = altitudeMeters / Math.max(planetRadius, 1);
	if (altRatio >= 3) return 8;
	if (altRatio >= 1) return 12;
	if (altRatio >= 0.3) return 16;
	if (altRatio >= 0.1) return 24;
	return 28;
}

export function chooseOrbitPatchResolution(altitudeMeters: number, planetRadius: number): number {
	const altRatio = altitudeMeters / Math.max(planetRadius, 1);
	if (altRatio >= 3) return 8;
	if (altRatio >= 1) return 16;
	if (altRatio >= 0.3) return 32;
	if (altRatio >= 0.1) return 64;
	return 96;
}

/** Cube face index: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z */
export function cubeFaceUvToPosition(face: number, u: number, v: number): Vec3 {
	const a = u * 2 - 1;
	const b = v * 2 - 1;
	switch (face) {
		case 0:
			return [1, b, -a];
		case 1:
			return [-1, b, a];
		case 2:
			return [a, 1, -b];
		case 3:
			return [a, -1, b];
		case 4:
			return [a, b, 1];
		case 5:
			return [-a, b, -1];
		default:
			return [0, 0, 1];
	}
}

export function cubeFaceUvToUnitDir(face: number, u: number, v: number): Vec3 {
	return normalize3(cubeFaceUvToPosition(face, u, v));
}

export function buildOrbitPatchGrid(
	facesPerSide: number,
	patchResolution: number,
	startId = 0
): CubeSpherePatch[] {
	const patches: CubeSpherePatch[] = [];
	let id = startId;
	const step = 1 / facesPerSide;
	for (let face = 0; face < 6; face++) {
		for (let py = 0; py < facesPerSide; py++) {
			for (let px = 0; px < facesPerSide; px++) {
				patches.push({
					kind: 'cubeSphere',
					id: id++,
					face: face as CubeSpherePatch['face'],
					uvMin: [px * step, py * step],
					uvMax: [(px + 1) * step, (py + 1) * step],
					resolution: patchResolution,
					morph: 0
				});
			}
		}
	}
	return patches;
}

export function scheduleOrbitPatches(
	cameraPos: Vec3,
	planetRadius: number,
	viewProj: Float32Array,
	facesPerSide?: number,
	patchResolution?: number
): CubeSpherePatch[] {
	const altitude = Math.max(Math.hypot(cameraPos[0], cameraPos[1], cameraPos[2]) - planetRadius, 0);
	const faces = facesPerSide ?? chooseOrbitFacesPerSide(altitude, planetRadius);
	const resolution = patchResolution ?? chooseOrbitPatchResolution(altitude, planetRadius);
	const grid = buildOrbitPatchGrid(faces, resolution);
	return cullCubeSpherePatches(grid, cameraPos, planetRadius, viewProj);
}
