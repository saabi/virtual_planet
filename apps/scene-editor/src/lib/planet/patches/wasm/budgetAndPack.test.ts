import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOrbitCamera, type OrbitLookMode } from '../../camera/orbitCamera.js';
import { type OrbitSchedulerInput } from '../cubeSphereScheduler.js';
import { packBudgetedBuckets } from '../flatBudget.js';
import { MAX_CUBE_PATCHES } from '../../params/gpuBuffers.js';
import {
	budgetAndPackFlat,
	instantiateScheduler,
	scheduleCandidatesFlat
} from './schedulerWasm.js';

// Parity: the in-WASM budget+pack (budgetAndPackFlat) must reproduce the TS packer
// (packBudgetedBuckets) byte-for-byte. The TS packer is itself byte-parity proven
// against encodeCubeSpherePatches (flatPack.test.ts) and budget-parity proven
// against applyVertexBudget (flatBudget.test.ts), so this anchors the WASM port to
// the whole chain. Both consume the same candidate buffer scheduleCandidatesFlat
// leaves in linear memory.

const wasmPath = fileURLToPath(new URL('./scheduler.wasm', import.meta.url));
const viewport = { width: 1280, height: 720 };

beforeAll(async () => {
	await instantiateScheduler(fs.readFileSync(wasmPath));
});

function makeInput(distance: number, lookMode: OrbitLookMode = 'planet-center'): OrbitSchedulerInput {
	const cam = createOrbitCamera({
		distance,
		azimuth: 0.6,
		elevation: 0.35,
		fovDeg: 60,
		aspect: viewport.width / viewport.height,
		near: 0.1,
		far: distance * 1000,
		planetRadius: 100,
		lookMode
	});
	return {
		cameraPos: cam.position,
		planetRadius: 100,
		viewProj: cam.viewProjectionMatrix,
		viewport,
		targetVertexSpacingPx: 6
	};
}

function assertWasmPackParity(input: OrbitSchedulerInput, maxVertices: number): void {
	const flat = scheduleCandidatesFlat(input)!;

	// TS oracle (reads the candidate view; does not touch the WASM pack region).
	const ts = packBudgetedBuckets(flat.view, flat.count, maxVertices, MAX_CUBE_PATCHES);

	// WASM budget+pack over the same OUT-region candidates.
	const wasm = budgetAndPackFlat(flat.count, maxVertices, MAX_CUBE_PATCHES)!;

	expect(wasm.patchCount).toBe(ts.patchCount);
	expect(wasm.dropped).toBe(ts.dropped);
	expect(wasm.estimatedVertices).toBe(ts.estimatedVertices);

	const tsByRes = new Map(ts.packedBuckets.map((b) => [b.resolution, b]));
	const wasmByRes = new Map(wasm.packedBuckets.map((b) => [b.resolution, b]));
	expect([...wasmByRes.keys()].sort((a, b) => a - b)).toEqual(
		[...tsByRes.keys()].sort((a, b) => a - b)
	);

	for (const [res, tsBucket] of tsByRes) {
		const wasmBucket = wasmByRes.get(res);
		expect(wasmBucket, `WASM bucket res=${res} missing`).toBeDefined();
		expect(wasmBucket!.instanceCount).toBe(tsBucket.instanceCount);
		// Byte-for-byte. Copy the WASM view so the comparison is against a snapshot.
		expect(new Uint8Array(wasmBucket!.data)).toEqual(new Uint8Array(tsBucket.data));
	}
}

describe('budgetAndPackFlat (WASM) byte parity with packBudgetedBuckets (TS)', () => {
	const cases: Array<{ name: string; distance: number; lookMode?: OrbitLookMode }> = [
		{ name: 'high orbit (no budget pressure)', distance: 520 },
		{ name: 'mid orbit', distance: 240 },
		{ name: 'low orbit', distance: 140 },
		{ name: 'near surface (vertex budget bites)', distance: 105 },
		{ name: 'horizon look', distance: 180, lookMode: 'horizon' }
	];

	for (const c of cases) {
		it(`matches at default budget — ${c.name}`, () => {
			assertWasmPackParity(makeInput(c.distance, c.lookMode), 8_000_000);
		});
		it(`matches under tight vertex budget (coarsen + drop) — ${c.name}`, () => {
			assertWasmPackParity(makeInput(c.distance, c.lookMode), 400_000);
		});
	}
});
