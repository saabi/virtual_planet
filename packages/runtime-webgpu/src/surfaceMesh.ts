import '@world-lab/graph';
import { getPrimitive } from '@world-lab/graph';

export type SurfacePrimitiveId = 'surface.plane' | 'surface.cubeSphere';

export interface SurfaceMesh {
	positions: Float32Array;
	normals: Float32Array;
	indices: Uint32Array;
	vertexCount: number;
	indexCount: number;
}

const FACE_COUNT: Record<SurfacePrimitiveId, number> = {
	'surface.plane': 1,
	'surface.cubeSphere': 6
};

/** Build a triangle mesh by evaluating a surface primitive over a UV grid (× six faces for cube-sphere). */
export function buildSurfaceMesh(surfaceId: SurfacePrimitiveId, gridSize = 16): SurfaceMesh {
	if (gridSize < 2) {
		throw new RangeError('gridSize must be >= 2');
	}

	const primitive = getPrimitive(surfaceId);
	if (!primitive?.evalCPU) {
		throw new Error(`Missing evalCPU for ${surfaceId}`);
	}

	const faceCount = FACE_COUNT[surfaceId];
	const vertsPerFace = gridSize * gridSize;
	const vertexCount = vertsPerFace * faceCount;
	const positions = new Float32Array(vertexCount * 3);
	const normals = new Float32Array(vertexCount * 3);

	let vertex = 0;
	for (let face = 0; face < faceCount; face++) {
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				const u = x / (gridSize - 1);
				const v = y / (gridSize - 1);
				const params: Record<string, number | boolean> =
					surfaceId === 'surface.cubeSphere' ? { face } : {};
				const out = primitive.evalCPU({
					inputs: { uv: [u, v] },
					params
				}) as { position: number[]; normal: number[] };

				const offset = vertex * 3;
				positions[offset] = out.position[0];
				positions[offset + 1] = out.position[1];
				positions[offset + 2] = out.position[2];
				normals[offset] = out.normal[0];
				normals[offset + 1] = out.normal[1];
				normals[offset + 2] = out.normal[2];
				vertex++;
			}
		}
	}

	const quadsPerFace = (gridSize - 1) * (gridSize - 1);
	const indexCount = faceCount * quadsPerFace * 6;
	const indices = new Uint32Array(indexCount);
	let index = 0;

	for (let face = 0; face < faceCount; face++) {
		const base = face * vertsPerFace;
		for (let y = 0; y < gridSize - 1; y++) {
			for (let x = 0; x < gridSize - 1; x++) {
				const i0 = base + y * gridSize + x;
				const i1 = i0 + 1;
				const i2 = i0 + gridSize;
				const i3 = i2 + 1;
				indices[index++] = i0;
				indices[index++] = i1;
				indices[index++] = i2;
				indices[index++] = i1;
				indices[index++] = i3;
				indices[index++] = i2;
			}
		}
	}

	return { positions, normals, indices, vertexCount, indexCount };
}
