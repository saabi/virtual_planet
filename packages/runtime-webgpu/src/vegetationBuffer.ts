import { alignTo } from './buffers.js';
import type { Density3, VegetationCandidateGpuRecord, VegetationChannel } from './vegetationTypes.js';

export const VEGETATION_CANDIDATE_STRIDE = 64;

export function vegetationCandidateBufferByteLength(maxCandidates: number): number {
	return alignTo(maxCandidates * VEGETATION_CANDIDATE_STRIDE, 4);
}

export function encodeVegetationCandidate(
	record: VegetationCandidateGpuRecord,
	view: DataView,
	offset: number
): void {
	view.setUint32(offset + 0, record.ix, true);
	view.setUint32(offset + 4, record.iy, true);
	view.setUint32(offset + 8, record.channel, true);
	view.setUint32(offset + 12, 0, true);
	view.setFloat32(offset + 16, record.position[0], true);
	view.setFloat32(offset + 20, record.position[1], true);
	view.setFloat32(offset + 24, record.position[2], true);
	view.setFloat32(offset + 28, 0, true);
	view.setFloat32(offset + 32, record.localMeters[0], true);
	view.setFloat32(offset + 36, record.localMeters[1], true);
	view.setFloat32(offset + 40, record.density[0], true);
	view.setFloat32(offset + 44, record.density[1], true);
	view.setFloat32(offset + 48, record.density[2], true);
	view.setFloat32(offset + 52, record.placement, true);
	view.setFloat32(offset + 56, record.prominence, true);
	view.setFloat32(offset + 60, record.vigor, true);
}

export function decodeVegetationCandidates(
	data: ArrayBuffer,
	count: number
): VegetationCandidateGpuRecord[] {
	const view = new DataView(data);
	const results: VegetationCandidateGpuRecord[] = [];
	for (let index = 0; index < count; index += 1) {
		const base = index * VEGETATION_CANDIDATE_STRIDE;
		results.push({
			ix: view.getUint32(base + 0, true),
			iy: view.getUint32(base + 4, true),
			channel: view.getUint32(base + 8, true) as VegetationChannel,
			position: [
				view.getFloat32(base + 16, true),
				view.getFloat32(base + 20, true),
				view.getFloat32(base + 24, true)
			],
			localMeters: [
				view.getFloat32(base + 32, true),
				view.getFloat32(base + 36, true)
			],
			density: [
				view.getFloat32(base + 40, true),
				view.getFloat32(base + 44, true),
				view.getFloat32(base + 48, true)
			] as Density3,
			placement: view.getFloat32(base + 52, true),
			prominence: view.getFloat32(base + 56, true),
			vigor: view.getFloat32(base + 60, true)
		});
	}
	return results;
}
