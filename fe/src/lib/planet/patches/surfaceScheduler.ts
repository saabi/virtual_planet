import type { SurfacePatch } from './types.js';

export interface SurfaceSchedulerInput {
	cameraFootLocal: [number, number];
	cameraAltitudeMeters: number;
	targetVertexSpacingMeters: number;
	focalLengthPx: number;
	viewportHeightPx: number;
	maxRings?: number;
}

function nextPow2(n: number): number {
	return 2 ** Math.ceil(Math.log2(Math.max(2, n)));
}

/**
 * Ring-based surface patch carpet centered on camera foot point.
 * worldVertexSpacing ≈ targetPx * distance / focalLengthPx
 */
export function buildSurfacePatchRings(input: SurfaceSchedulerInput): SurfacePatch[] {
	const {
		cameraFootLocal,
		cameraAltitudeMeters,
		targetVertexSpacingMeters,
		focalLengthPx,
		viewportHeightPx,
		maxRings = 8
	} = input;

	const distance = Math.max(cameraAltitudeMeters, 1);
	const targetPx = 4;
	const worldVertexSpacingMeters =
		targetVertexSpacingMeters > 0
			? targetVertexSpacingMeters
			: (targetPx * distance) / focalLengthPx;

	const baseSize = nextPow2(worldVertexSpacingMeters * 8);
	const resolution = 16;
	const patches: SurfacePatch[] = [];
	let id = 0;

	for (let ring = 0; ring < maxRings; ring++) {
		const sizeMeters = baseSize * 2 ** ring;
		const maxFeatureMeters = sizeMeters * 0.5;
		const ringExtent = ring === 0 ? 1 : ring * 2 + 1;
		const half = (ringExtent * sizeMeters) / 2;
		const originBaseX = cameraFootLocal[0] - half + sizeMeters * 0.5;
		const originBaseY = cameraFootLocal[1] - half + sizeMeters * 0.5;

		for (let j = 0; j < ringExtent; j++) {
			for (let i = 0; i < ringExtent; i++) {
				if (ring > 0) {
					const onBorder =
						i === 0 || j === 0 || i === ringExtent - 1 || j === ringExtent - 1;
					if (!onBorder) continue;
				}
				patches.push({
					kind: 'surface',
					id: id++,
					originLocalMeters: [originBaseX + i * sizeMeters, originBaseY + j * sizeMeters],
					sizeMeters,
					resolution,
					ring,
					maxFeatureMeters,
					morph: 0
				});
			}
		}
	}

	void viewportHeightPx;
	return patches;
}
