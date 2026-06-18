// JS wrapper around scheduler.wasm — the AssemblyScript port of
// cubeSphereScheduler.ts::scheduleAdaptiveOrbitPatches.
//
// One boundary crossing per schedule: camera + view-projection in, a packed
// patch-descriptor buffer out. The JS scheduler stays as the parity oracle and
// the fallback when WASM is unavailable (WebGL backend, instantiation failure,
// or before the async load resolves).
import type { CubeSpherePatch } from '../types.js';
import type { OrbitSchedulerInput, ScheduledPatch } from '../cubeSphereScheduler.js';

// Linear-memory layout (byte offsets). Mirrors the regions scheduler.ts reads.
const VP_OFF = 0; // 16 f32 (view-projection)
const CAM_OFF = 64; // 3 f64 (camera world pos)
const STACK_OFF = 4096; // DFS scratch (5 f64 per node, ample for depth<=6 DFS)
const OUT_OFF = 393216; // 7 f64 per emitted patch
const OUT_MAX = 32768; // > 6 * 4^6 walk ceiling; never clamps

const VP_F32 = VP_OFF / 4;
const CAM_F64 = CAM_OFF / 8;
const OUT_F64 = OUT_OFF / 8;

// Bytes the layout needs (OUT region end); grow memory to cover it.
const NEEDED_BYTES = OUT_OFF + OUT_MAX * 56;
const PAGE = 65536;
const NEEDED_PAGES = Math.ceil(NEEDED_BYTES / PAGE);

type ScheduleExport = (
	vpPtr: number,
	camPtr: number,
	planetRadius: number,
	vw: number,
	vh: number,
	targetSpacing: number,
	stackPtr: number,
	outPtr: number,
	outMax: number
) => number;

let scheduleFn: ScheduleExport | null = null;
let f32: Float32Array | null = null;
let f64: Float64Array | null = null;

export function isSchedulerReady(): boolean {
	return scheduleFn !== null;
}

function bindInstance(instance: WebAssembly.Instance): void {
	const mem = instance.exports.memory as WebAssembly.Memory;
	const havePages = mem.buffer.byteLength / PAGE;
	if (havePages < NEEDED_PAGES) mem.grow(NEEDED_PAGES - havePages);
	// Views must be (re)built after grow — grow detaches the old ArrayBuffer.
	f32 = new Float32Array(mem.buffer);
	f64 = new Float64Array(mem.buffer);
	scheduleFn = instance.exports.scheduleOrbit as ScheduleExport;
}

/** Instantiate from raw bytes (tests, or an explicit fetch). Idempotent-ish. */
export async function instantiateScheduler(bytes: BufferSource): Promise<void> {
	const { instance } = await WebAssembly.instantiate(bytes, {});
	bindInstance(instance);
}

/** Browser auto-init: fetch the emitted .wasm and bind it. No-op on failure. */
export async function initSchedulerFromUrl(): Promise<void> {
	try {
		// new URL(..., import.meta.url) is statically detected by Vite, which emits
		// the .wasm as a build asset and rewrites this to its hashed URL.
		const url = new URL('./scheduler.wasm', import.meta.url);
		const res = await fetch(url);
		await instantiateScheduler(await res.arrayBuffer());
	} catch {
		// Leave scheduleFn null; callers fall back to the JS scheduler.
	}
}

/** f64 stride of one emitted candidate: [face, u0, v0, u1, v1, resolution, priority]. */
export const CANDIDATE_STRIDE = 7;

/** A flat candidate set: a view into WASM linear memory, valid until the next call. */
export interface FlatCandidates {
	/** Float64 view of the OUT region: count * CANDIDATE_STRIDE values. */
	view: Float64Array;
	count: number;
}

/**
 * Run the WASM quadtree walk, leaving candidates packed in linear memory. Returns
 * a view + count (no per-candidate object allocation), or null when WASM is not
 * ready so the caller can fall back to the JS scheduler.
 *
 * The returned view aliases WASM memory and is overwritten by the next call —
 * consume it before scheduling again.
 */
export function scheduleCandidatesFlat(input: OrbitSchedulerInput): FlatCandidates | null {
	const fn = scheduleFn;
	const fv = f32;
	const dv = f64;
	if (!fn || !fv || !dv) return null;

	const vp = input.viewProj;
	for (let i = 0; i < 16; i++) fv[VP_F32 + i] = vp[i];
	dv[CAM_F64] = input.cameraPos[0];
	dv[CAM_F64 + 1] = input.cameraPos[1];
	dv[CAM_F64 + 2] = input.cameraPos[2];

	const target = input.targetVertexSpacingPx ?? 6;
	const count = fn(
		VP_OFF,
		CAM_OFF,
		input.planetRadius,
		input.viewport.width,
		input.viewport.height,
		target,
		STACK_OFF,
		OUT_OFF,
		OUT_MAX
	);
	return { view: dv.subarray(OUT_F64, OUT_F64 + count * CANDIDATE_STRIDE), count };
}

/**
 * Object-returning walk: the parity oracle for tests and the materialized form.
 * Production (scheduleOrbitPatches) uses scheduleCandidatesFlat to avoid building
 * the full candidate set as objects.
 */
export function scheduleAdaptiveOrbitPatchesWasm(input: OrbitSchedulerInput): ScheduledPatch[] | null {
	const flat = scheduleCandidatesFlat(input);
	if (!flat) return null;
	const { view, count } = flat;
	const patches: ScheduledPatch[] = new Array(count);
	for (let i = 0; i < count; i++) {
		const o = i * CANDIDATE_STRIDE;
		patches[i] = {
			kind: 'cubeSphere',
			id: i,
			face: (view[o] | 0) as CubeSpherePatch['face'],
			uvMin: [view[o + 1], view[o + 2]],
			uvMax: [view[o + 3], view[o + 4]],
			resolution: view[o + 5] | 0,
			morph: 0,
			priority: view[o + 6]
		};
	}
	return patches;
}
