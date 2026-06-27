import type { GraphDocument, PortRef } from '@virtual-planet/graph';

export type Density3 = readonly [number, number, number];
export type VegetationChannel = 0 | 1 | 2;

/** A metric-space rectangular patch. origin is its minimum x/y corner. */
export interface VegetationPatch {
	id: string;
	origin: readonly [number, number, number];
	tangentX: readonly [number, number, number];
	tangentY: readonly [number, number, number];
	widthMeters: number;
	heightMeters: number;
}

export interface VegetationCandidateConfig {
	spacingMeters: number;
	channel: VegetationChannel;
	placementThreshold: number;
	densityThreshold: number;
	minProminence: number;
	minAltitudeMeters?: number;
	maxAltitudeMeters?: number;
	maxSlope?: number;
}

/** One emitted instance; omits string ids (reconstructed on CPU readback). */
export interface VegetationCandidateGpuRecord {
	ix: number;
	iy: number;
	channel: VegetationChannel;
	position: readonly [number, number, number];
	localMeters: readonly [number, number];
	density: Density3;
	placement: number;
	prominence: number;
	vigor: number;
}

export interface VegetationGraphBinding {
	graph: GraphDocument;
	output: PortRef;
}

export interface VegetationCandidateComputeInput {
	device: GPUDevice;
	patch: VegetationPatch;
	config: VegetationCandidateConfig;
	density: VegetationGraphBinding;
	placement: VegetationGraphBinding;
	maxCandidates: number;
}

export interface VegetationCandidateComputeResult {
	patchId: string;
	gridWidth: number;
	gridHeight: number;
	candidateCount: number;
	overflowed: boolean;
	candidates: VegetationCandidateGpuRecord[];
}

/** Same loop bounds as M12.1 generateVegetationCandidates. */
export function computeVegetationGridSize(
	patch: VegetationPatch,
	spacingMeters: number
): { gridWidth: number; gridHeight: number } {
	let gridWidth = 0;
	while ((gridWidth + 0.5) * spacingMeters < patch.widthMeters) gridWidth += 1;
	let gridHeight = 0;
	while ((gridHeight + 0.5) * spacingMeters < patch.heightMeters) gridHeight += 1;
	return { gridWidth, gridHeight };
}
