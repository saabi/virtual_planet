// A unit UV sphere, interleaved position(3) + normal(3). For a unit sphere the normal
// equals the position, so both come from the same coordinates. Uploaded once and drawn
// instanced (one sphere per body, scaled by radius). See scene-3d-viewport.md.

export interface SphereMesh {
	/** Interleaved [px,py,pz, nx,ny,nz] per vertex. */
	vertices: Float32Array;
	indices: Uint16Array;
	indexCount: number;
}

export function makeUVSphere(latBands = 16, lonBands = 24): SphereMesh {
	const verts: number[] = [];
	for (let lat = 0; lat <= latBands; lat++) {
		const theta = (lat * Math.PI) / latBands;
		const st = Math.sin(theta);
		const ct = Math.cos(theta);
		for (let lon = 0; lon <= lonBands; lon++) {
			const phi = (lon * 2 * Math.PI) / lonBands;
			const x = Math.cos(phi) * st;
			const y = ct;
			const z = Math.sin(phi) * st;
			verts.push(x, y, z, x, y, z); // position + normal (unit sphere)
		}
	}
	const idx: number[] = [];
	const stride = lonBands + 1;
	for (let lat = 0; lat < latBands; lat++) {
		for (let lon = 0; lon < lonBands; lon++) {
			const a = lat * stride + lon;
			const b = a + stride;
			idx.push(a, b, a + 1, b, b + 1, a + 1);
		}
	}
	return {
		vertices: new Float32Array(verts),
		indices: new Uint16Array(idx),
		indexCount: idx.length
	};
}
