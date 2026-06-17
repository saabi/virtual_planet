/** User-facing tessellation/quality controls for the orbit cube-sphere mesh. */
export interface TessellationSettings {
	/** Density multiplier: >1 finer, <1 coarser. */
	detail: number;
	/** Per-frame vertex budget, in millions. */
	vertexBudgetMillions: number;
}

export const DEFAULT_TESSELLATION: TessellationSettings = {
	detail: 1,
	vertexBudgetMillions: 8
};
