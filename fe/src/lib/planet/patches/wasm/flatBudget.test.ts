import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOrbitCamera, type OrbitLookMode } from '../../camera/orbitCamera.js';
import {
	groupPatchesByResolution,
	scheduleAdaptiveOrbitPatches,
	totalVertexCount,
	type OrbitSchedulerInput
} from '../cubeSphereScheduler.js';
import { applyVertexBudget } from '../vertexBudget.js';
import { budgetAndGroupFlat } from '../flatBudget.js';
import { MAX_CUBE_PATCHES } from '../../params/gpuBuffers.js';
import { instantiateScheduler, scheduleCandidatesFlat } from './schedulerWasm.js';

// Parity: budgetAndGroupFlat (flat buffer → survivors) must reproduce
// applyVertexBudget + groupPatchesByResolution (the object oracle). The candidate
// sets feeding both are already proven bit-exact (scheduler.test.ts), so any
// difference here is the budget/grouping logic.

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

function key(p: { face: number; uvMin: [number, number]; uvMax: [number, number] }): string {
	return `${p.face}|${p.uvMin[0]}|${p.uvMin[1]}|${p.uvMax[0]}|${p.uvMax[1]}`;
}

function assertBudgetParity(input: OrbitSchedulerInput, maxVertices: number): void {
	// Object oracle (JS walk → applyVertexBudget → group).
	const candidates = scheduleAdaptiveOrbitPatches(input);
	const objBudget = applyVertexBudget(candidates, maxVertices, MAX_CUBE_PATCHES);
	const objPatches = objBudget.patches;
	const objBuckets = groupPatchesByResolution(objPatches);
	const objVerts = totalVertexCount(objPatches);

	// Flat path (WASM walk → budgetAndGroupFlat).
	const flat = scheduleCandidatesFlat(input)!;
	const flatRes = budgetAndGroupFlat(flat.view, flat.count, maxVertices, MAX_CUBE_PATCHES);

	expect(flat.count).toBe(candidates.length);
	expect(flatRes.patches.length).toBe(objPatches.length);
	expect(flatRes.dropped).toBe(objBudget.dropped);
	expect(flatRes.estimatedVertices).toBe(objVerts);

	// Same survivor geometry + final (possibly coarsened) resolution.
	const objByKey = new Map(objPatches.map((p) => [key(p), p.resolution]));
	for (const p of flatRes.patches) {
		const r = objByKey.get(key(p));
		expect(r, `flat survivor ${key(p)} missing from oracle`).toBeDefined();
		expect(p.resolution).toBe(r);
	}

	// Same resolution buckets.
	expect([...flatRes.buckets.keys()].sort()).toEqual([...objBuckets.keys()].sort());
	for (const [res, list] of flatRes.buckets) {
		expect(list.length).toBe(objBuckets.get(res)!.length);
	}
}

describe('budgetAndGroupFlat parity with applyVertexBudget + grouping', () => {
	const cases: Array<{ name: string; distance: number; lookMode?: OrbitLookMode }> = [
		{ name: 'high orbit (no budget pressure)', distance: 520 },
		{ name: 'mid orbit', distance: 240 },
		{ name: 'low orbit', distance: 140 },
		{ name: 'near surface (vertex budget bites)', distance: 105 },
		{ name: 'horizon look', distance: 180, lookMode: 'horizon' }
	];

	for (const c of cases) {
		it(`matches at default budget — ${c.name}`, () => {
			assertBudgetParity(makeInput(c.distance, c.lookMode), 8_000_000);
		});
		it(`matches under tight vertex budget (coarsen + drop) — ${c.name}`, () => {
			// Small budget forces the coarsen-then-drop loop across many patches.
			assertBudgetParity(makeInput(c.distance, c.lookMode), 400_000);
		});
	}
});
