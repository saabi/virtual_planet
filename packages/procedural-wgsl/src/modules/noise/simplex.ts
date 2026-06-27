/** Deterministic Fisher–Yates shuffle — mirrors `packages/graph/src/primitives/simplex.ts`. */
function buildPermutationTable(): number[] {
	const base = new Uint8Array(256);
	for (let i = 0; i < 256; i++) base[i] = i;
	let seed = 1315423911;
	for (let i = 255; i > 0; i--) {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		const j = seed % (i + 1);
		const tmp = base[i]!;
		base[i] = base[j]!;
		base[j] = tmp;
	}
	const p = new Array<number>(512);
	for (let i = 0; i < 512; i++) p[i] = base[i & 255]!;
	return p;
}

function formatPermArray(values: number[]): string {
	const lines: string[] = [];
	for (let i = 0; i < values.length; i += 16) {
		lines.push('\t' + values.slice(i, i + 16).join(', ') + ',');
	}
	return lines.join('\n');
}

/** WGSL module `noise.simplex` — 3D simplex noise (matches graph evalCPU). */
export const NOISE_SIMPLEX_SOURCE = `const SIMPLEX_PERM: array<u32, 512> = array<u32, 512>(
${formatPermArray(buildPermutationTable())}
);

const SIMPLEX_F3: f32 = 1.0 / 3.0;
const SIMPLEX_G3: f32 = 1.0 / 6.0;

fn simplex_grad3(gi: u32) -> vec3<f32> {
	switch (gi % 12u) {
		case 0u: { return vec3<f32>(1.0, 1.0, 0.0); }
		case 1u: { return vec3<f32>(-1.0, 1.0, 0.0); }
		case 2u: { return vec3<f32>(1.0, -1.0, 0.0); }
		case 3u: { return vec3<f32>(-1.0, -1.0, 0.0); }
		case 4u: { return vec3<f32>(1.0, 0.0, 1.0); }
		case 5u: { return vec3<f32>(-1.0, 0.0, 1.0); }
		case 6u: { return vec3<f32>(1.0, 0.0, -1.0); }
		case 7u: { return vec3<f32>(-1.0, 0.0, -1.0); }
		case 8u: { return vec3<f32>(0.0, 1.0, 1.0); }
		case 9u: { return vec3<f32>(0.0, -1.0, 1.0); }
		case 10u: { return vec3<f32>(0.0, 1.0, -1.0); }
		default: { return vec3<f32>(0.0, -1.0, -1.0); }
	}
}

fn simplex_contrib(x: f32, y: f32, z: f32, gi: u32) -> f32 {
	let t = 0.6 - x * x - y * y - z * z;
	if (t < 0.0) {
		return 0.0;
	}
	let g = simplex_grad3(gi);
	return t * t * t * t * dot(g, vec3<f32>(x, y, z));
}

fn simplex3d(position: vec3<f32>) -> f32 {
	let x = position.x;
	let y = position.y;
	let z = position.z;
	let s = (x + y + z) * SIMPLEX_F3;
	let i = i32(floor(x + s));
	let j = i32(floor(y + s));
	let k = i32(floor(z + s));
	let t = f32(i + j + k) * SIMPLEX_G3;
	let x0 = x - (f32(i) - t);
	let y0 = y - (f32(j) - t);
	let z0 = z - (f32(k) - t);

	var i1 = 0;
	var j1 = 0;
	var k1 = 0;
	var i2 = 0;
	var j2 = 0;
	var k2 = 0;

	if (x0 >= y0) {
		if (y0 >= z0) {
			i1 = 1; j1 = 0; k1 = 0;
			i2 = 1; j2 = 1; k2 = 0;
		} else if (x0 >= z0) {
			i1 = 1; j1 = 0; k1 = 0;
			i2 = 1; j2 = 0; k2 = 1;
		} else {
			i1 = 0; j1 = 0; k1 = 1;
			i2 = 1; j2 = 0; k2 = 1;
		}
	} else if (y0 < z0) {
		i1 = 0; j1 = 0; k1 = 1;
		i2 = 0; j2 = 1; k2 = 1;
	} else if (x0 < z0) {
		i1 = 0; j1 = 1; k1 = 0;
		i2 = 0; j2 = 1; k2 = 1;
	} else {
		i1 = 0; j1 = 1; k1 = 0;
		i2 = 1; j2 = 1; k2 = 0;
	}

	let ii = u32(i) & 255u;
	let jj = u32(j) & 255u;
	let kk = u32(k) & 255u;

	let gi0 = SIMPLEX_PERM[ii + SIMPLEX_PERM[jj + SIMPLEX_PERM[kk]]] % 12u;
	let gi1 = SIMPLEX_PERM[ii + u32(i1) + SIMPLEX_PERM[jj + u32(j1) + SIMPLEX_PERM[kk + u32(k1)]]] % 12u;
	let gi2 = SIMPLEX_PERM[ii + u32(i2) + SIMPLEX_PERM[jj + u32(j2) + SIMPLEX_PERM[kk + u32(k2)]]] % 12u;
	let gi3 = SIMPLEX_PERM[ii + 1u + SIMPLEX_PERM[jj + 1u + SIMPLEX_PERM[kk + 1u]]] % 12u;

	let n0 = simplex_contrib(x0, y0, z0, gi0);
	let n1 = simplex_contrib(x0 - f32(i1) + SIMPLEX_G3, y0 - f32(j1) + SIMPLEX_G3, z0 - f32(k1) + SIMPLEX_G3, gi1);
	let n2 = simplex_contrib(x0 - f32(i2) + 2.0 * SIMPLEX_G3, y0 - f32(j2) + 2.0 * SIMPLEX_G3, z0 - f32(k2) + 2.0 * SIMPLEX_G3, gi2);
	let n3 = simplex_contrib(x0 - 1.0 + 3.0 * SIMPLEX_G3, y0 - 1.0 + 3.0 * SIMPLEX_G3, z0 - 1.0 + 3.0 * SIMPLEX_G3, gi3);

	return 32.0 * (n0 + n1 + n2 + n3);
}`;

export const NOISE_SIMPLEX_MODULE = {
	id: 'noise.simplex',
	source: NOISE_SIMPLEX_SOURCE
} as const;
