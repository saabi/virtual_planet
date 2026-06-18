import type { CubeSpherePatch } from './types.js';

// Flat-buffer vertex budget + resolution grouping. The WASM scheduler emits
// candidates straight into linear memory (7 f64 per patch:
// [face, u0, v0, u1, v1, resolution, priority]); this selects the survivors and
// builds CubeSpherePatch objects for *only* those — skipping the per-frame
// allocation of the full candidate explosion that the object path incurs.
//
// It is a faithful mirror of vertexBudget.ts::applyVertexBudget +
// cubeSphereScheduler.ts::groupPatchesByResolution (which stay as the parity
// oracle + JS/WebGL fallback); parity is guarded by flatBudget.test.ts.

const FIELDS = 7; // f64 per candidate in the flat buffer

export interface FlatBudgetResult {
	patches: CubeSpherePatch[];
	buckets: Map<number, CubeSpherePatch[]>;
	dropped: number;
	estimatedVertices: number;
}

/** Mirrors vertexBudget.ts::coarsenResolution. */
function coarsenResolution(resolution: number): number {
	if (resolution <= 8) return 8;
	if (resolution <= 16) return 8;
	if (resolution <= 32) return 16;
	if (resolution <= 64) return 32;
	return 64;
}

/** Vertices per instanced cube patch (mirrors cubePatchVertexCount for integer res). */
function vtx(resolution: number): number {
	return resolution * resolution * 6;
}

/**
 * Select budgeted survivors from a flat candidate buffer and group them by final
 * resolution. `view` must hold at least `count * 7` f64; only the first
 * `count` candidates are read.
 */
export function budgetAndGroupFlat(
	view: Float64Array,
	count: number,
	maxVertices: number,
	maxPatches: number
): FlatBudgetResult {
	const prio = (i: number): number => view[i * FIELDS + 6];

	// Candidate indices, initially in emit order (matches the object oracle, whose
	// `kept` starts as the candidate array order — important for stable-sort ties).
	let kept: number[] = new Array(count);
	for (let i = 0; i < count; i++) kept[i] = i;

	let dropped = 0;

	// Patch-count cap first: keep the highest-priority candidates.
	if (kept.length > maxPatches) {
		kept.sort((a, b) => prio(b) - prio(a));
		dropped += kept.length - maxPatches;
		kept = kept.slice(0, maxPatches);
	}

	const K = kept.length;
	// Resolution is mutable (coarsening); priority is read-only per kept slot.
	const keptRes = new Int32Array(K);
	for (let j = 0; j < K; j++) keptRes[j] = view[kept[j] * FIELDS + 5] | 0;
	const live = new Uint8Array(K).fill(1);

	let total = 0;
	for (let j = 0; j < K; j++) total += vtx(keptRes[j]);

	if (total > maxVertices) {
		// Process lowest-priority first; coarsen, then drop. Stable on ties.
		const order = new Array<number>(K);
		for (let j = 0; j < K; j++) order[j] = j;
		order.sort((a, b) => prio(kept[a]) - prio(kept[b]));

		for (const j of order) {
			if (total <= maxVertices) break;
			if (!live[j]) continue;
			const before = vtx(keptRes[j]);
			const coarser = coarsenResolution(keptRes[j]);
			if (coarser < keptRes[j]) {
				keptRes[j] = coarser;
				total += vtx(keptRes[j]) - before;
				continue;
			}
			live[j] = 0;
			total -= before;
			dropped++;
		}
	}

	// Materialize survivors (only) in kept order; group by final resolution.
	const patches: CubeSpherePatch[] = [];
	const buckets = new Map<number, CubeSpherePatch[]>();
	let estimatedVertices = 0;
	for (let j = 0; j < K; j++) {
		if (!live[j]) continue;
		const i = kept[j];
		const b = i * FIELDS;
		const r = keptRes[j];
		const patch: CubeSpherePatch = {
			kind: 'cubeSphere',
			id: i,
			face: (view[b] | 0) as CubeSpherePatch['face'],
			uvMin: [view[b + 1], view[b + 2]],
			uvMax: [view[b + 3], view[b + 4]],
			resolution: r,
			morph: 0
		};
		patches.push(patch);
		estimatedVertices += vtx(r);
		const list = buckets.get(r) ?? [];
		list.push(patch);
		buckets.set(r, list);
	}

	return { patches, buckets, dropped, estimatedVertices };
}
