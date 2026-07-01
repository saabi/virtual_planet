/** User-facing tessellation/quality controls for the orbit cube-sphere mesh. */
export interface TessellationSettings {
	/** Density multiplier: >1 finer, <1 coarser. */
	detail: number;
	/** Per-frame vertex budget, in millions. */
	vertexBudgetMillions: number;
	/** Cap on patch resolution; 0 = altitude-based auto (current behavior). */
	maxPatchResolution: 0 | 8 | 16 | 32 | 64 | 96;
	/** Cap on subdivision depth; 0 = altitude-based auto. */
	maxDepth: 0 | 3 | 4 | 5 | 6;
}

export const DEFAULT_TESSELLATION: TessellationSettings = {
	detail: 1,
	vertexBudgetMillions: 8,
	maxPatchResolution: 0,
	maxDepth: 0
};

/**
 * Lowest-cost preset — the per-device starting point on mobile, chosen so the
 * first frame is guaranteed to render on weak GPUs (the user can then raise
 * quality, or a future watchdog can ramp it). Every lever is at its floor:
 * minimum vertex budget, smallest patch resolution, shallowest depth, coarsest
 * spacing. See _docs/specs/device-tessellation-defaults.md.
 */
export const MOBILE_TESSELLATION: TessellationSettings = {
	detail: 0.05,
	vertexBudgetMillions: 0.05,
	maxPatchResolution: 8,
	maxDepth: 3
};
