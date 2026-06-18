import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOrbitCamera } from '../../camera/orbitCamera.js';
import { cubeFaceUvToUnitDir } from '../cubeSphere.js';

// PoC: AssemblyScript/WASM port of the scheduler's projection hot path,
// verified headless against the JS reference (no GPU needed).

const wasmPath = fileURLToPath(new URL('./projectBatch.wasm', import.meta.url));
const VW = 1280;
const VH = 720;
const N = 1024;

let projectBatch: (vpPtr: number, cornersPtr: number, count: number, outPtr: number, vw: number, vh: number) => void;
let f32: Float32Array;
const VP_OFF = 0; // f32 index of view-projection (16 floats)
const CORNERS_OFF = 16; // f32 index of corners (N*3)
const OUT_OFF = 16 + N * 3; // f32 index of output (N*3)

beforeAll(async () => {
	const bytes = fs.readFileSync(wasmPath);
	const { instance } = await WebAssembly.instantiate(bytes, {});
	const mem = instance.exports.memory as WebAssembly.Memory;
	mem.grow(8); // 8 pages = 512 KB; fits VP + N corners + N outputs
	f32 = new Float32Array(mem.buffer);
	projectBatch = instance.exports.projectBatch as typeof projectBatch;
});

/** JS reference: mirrors screenSpace.ts::projectWorldPoint (f64). */
function projJs(vp: Float32Array, x: number, y: number, z: number): [number, number, number] {
	const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
	const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
	const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
	if (cw <= 1e-6) return [0, 0, 1];
	const invW = 1 / cw;
	return [(cx * invW * 0.5 + 0.5) * VW, (1 - (cy * invW * 0.5 + 0.5)) * VH, 0];
}

/** Planet-surface corners (dir * radius), like patchScreenBounds samples. */
function buildCorners(radius: number): Float32Array {
	const out = new Float32Array(N * 3);
	let i = 0;
	for (let n = 0; n < N; n++) {
		const face = n % 6;
		const u = (Math.sin(n * 12.9898) * 0.5 + 0.5);
		const v = (Math.sin(n * 78.233) * 0.5 + 0.5);
		const d = cubeFaceUvToUnitDir(face, u, v);
		out[i++] = d[0] * radius;
		out[i++] = d[1] * radius;
		out[i++] = d[2] * radius;
	}
	return out;
}

function loadInputs(vp: Float32Array, corners: Float32Array) {
	for (let i = 0; i < 16; i++) f32[VP_OFF + i] = vp[i];
	for (let i = 0; i < corners.length; i++) f32[CORNERS_OFF + i] = corners[i];
}

describe('projectBatch wasm PoC', () => {
	it('matches the JS reference projection (parity)', () => {
		const cam = createOrbitCamera({
			distance: 320,
			azimuth: 0.6,
			elevation: 0.35,
			fovDeg: 60,
			aspect: VW / VH,
			near: 0.1,
			far: 10_000,
			planetRadius: 100,
			lookMode: 'planet-center'
		});
		const vp = cam.viewProjectionMatrix;
		const corners = buildCorners(100);
		loadInputs(vp, corners);
		projectBatch(VP_OFF * 4, CORNERS_OFF * 4, N, OUT_OFF * 4, VW, VH);

		let maxErr = 0;
		for (let n = 0; n < N; n++) {
			const [jx, jy, jb] = projJs(vp, corners[n * 3], corners[n * 3 + 1], corners[n * 3 + 2]);
			const wx = f32[OUT_OFF + n * 3];
			const wy = f32[OUT_OFF + n * 3 + 1];
			const wb = f32[OUT_OFF + n * 3 + 2];
			expect(wb).toBe(jb); // behind flag identical
			if (jb === 0) {
				maxErr = Math.max(maxErr, Math.abs(wx - jx), Math.abs(wy - jy));
			}
		}
		// f32 (wasm) vs f64 (JS) → sub-pixel; well under one pixel of screen error.
		expect(maxErr).toBeLessThan(0.5);
	});

	it('benchmarks wasm vs js projection throughput', () => {
		const cam = createOrbitCamera({
			distance: 320,
			azimuth: 0.6,
			elevation: 0.35,
			fovDeg: 60,
			aspect: VW / VH,
			near: 0.1,
			far: 10_000,
			planetRadius: 100,
			lookMode: 'planet-center'
		});
		const vp = cam.viewProjectionMatrix;
		const corners = buildCorners(100);
		loadInputs(vp, corners);
		const ITERS = 3000;
		const jsOut = new Float32Array(N * 3);

		// warm up
		for (let k = 0; k < 50; k++) projectBatch(VP_OFF * 4, CORNERS_OFF * 4, N, OUT_OFF * 4, VW, VH);

		const t0 = performance.now();
		for (let k = 0; k < ITERS; k++) {
			projectBatch(VP_OFF * 4, CORNERS_OFF * 4, N, OUT_OFF * 4, VW, VH);
		}
		const wasmMs = performance.now() - t0;

		const t1 = performance.now();
		for (let k = 0; k < ITERS; k++) {
			for (let n = 0; n < N; n++) {
				const [x, y, b] = projJs(vp, corners[n * 3], corners[n * 3 + 1], corners[n * 3 + 2]);
				jsOut[n * 3] = x;
				jsOut[n * 3 + 1] = y;
				jsOut[n * 3 + 2] = b;
			}
		}
		const jsMs = performance.now() - t1;

		const projections = ITERS * N;
		fs.writeFileSync(
			'/tmp/wasm-bench.txt',
			`projections=${projections}\nwasm=${wasmMs.toFixed(1)}ms js=${jsMs.toFixed(1)}ms speedup=${(jsMs / wasmMs).toFixed(2)}x\n`
		);
		expect(wasmMs).toBeGreaterThan(0);
	});
});
