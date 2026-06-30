/** CPU mirror of `plane_grid_position` / triangle-list topology for `geometry.plane`. */

export function planeGridVertexCount(resU: number, resV: number): number {
	return Math.max(0, resU - 1) * Math.max(0, resV - 1) * 6;
}

/** Map a triangle-list vertex id to clip-space plane position (matches procedural-wgsl). */
export function planeGridPosition(vid: number, resU: number, resV: number): [number, number, number] {
	const quadsPerRow = resU - 1;
	const quadIdx = Math.floor(vid / 6);
	const cornerInTri = vid % 6;
	const quadU = quadIdx % quadsPerRow;
	const quadV = Math.floor(quadIdx / quadsPerRow);

	let uLocal = 0;
	let vLocal = 0;
	switch (cornerInTri) {
		case 0:
			uLocal = 0;
			vLocal = 0;
			break;
		case 1:
			uLocal = 1;
			vLocal = 0;
			break;
		case 2:
			uLocal = 0;
			vLocal = 1;
			break;
		case 3:
			uLocal = 1;
			vLocal = 0;
			break;
		case 4:
			uLocal = 1;
			vLocal = 1;
			break;
		default:
			uLocal = 0;
			vLocal = 1;
			break;
	}

	const u = (quadU + uLocal) / (resU - 1);
	const v = (quadV + vLocal) / (resV - 1);
	const x = u * 2 - 1;
	const y = 1 - v * 2;
	return [x, y, 0];
}

/** Flattened xyz positions for every triangle-list vertex. */
export function planeGridMeshPositions(resU: number, resV: number): number[] {
	const count = planeGridVertexCount(resU, resV);
	const positions: number[] = [];
	for (let vid = 0; vid < count; vid++) {
		positions.push(...planeGridPosition(vid, resU, resV));
	}
	return positions;
}
