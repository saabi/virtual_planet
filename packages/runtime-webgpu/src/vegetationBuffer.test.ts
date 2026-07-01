import { describe, expect, it } from 'vitest';

import {
	VEGETATION_CANDIDATE_GPU_STRIDE,
	VEGETATION_CANDIDATE_STRIDE,
	decodeVegetationCandidates,
	encodeVegetationCandidate,
	vegetationCandidateBufferByteLength
} from './vegetationBuffer.js';
import { computeVegetationGridSize } from './vegetationTypes.js';

describe('vegetationBuffer', () => {
	it('VEGETATION_CANDIDATE_STRIDE is 64 bytes', () => {
		expect(VEGETATION_CANDIDATE_STRIDE).toBe(64);
	});

	it('vegetationCandidateBufferByteLength(10) is aligned and at least 640 bytes', () => {
		const length = vegetationCandidateBufferByteLength(10);
		expect(length).toBeGreaterThanOrEqual(640);
		expect(length % 4).toBe(0);
	});

	it('vegetationCandidateBufferByteLength(0) meets GPU min binding size', () => {
		expect(vegetationCandidateBufferByteLength(0)).toBe(80);
	});

	it('round-trips a synthetic candidate record', () => {
		const record = {
			ix: 2,
			iy: 3,
			channel: 1 as const,
			position: [10.5, 20.25, -1.5] as const,
			localMeters: [1.25, 2.75] as const,
			density: [0.8, 0.2, 0.1] as const,
			placement: 0.95,
			prominence: 0.15,
			vigor: 0.19
		};

		const buffer = new ArrayBuffer(VEGETATION_CANDIDATE_GPU_STRIDE);
		const view = new DataView(buffer);
		encodeVegetationCandidate(record, view, 0);

		const [decoded] = decodeVegetationCandidates(buffer, 1);
		expect(decoded.ix).toBe(record.ix);
		expect(decoded.iy).toBe(record.iy);
		expect(decoded.channel).toBe(record.channel);
		expect(decoded.position).toEqual(record.position);
		expect(decoded.localMeters).toEqual(record.localMeters);
		expect(decoded.density[0]).toBeCloseTo(record.density[0]);
		expect(decoded.density[1]).toBeCloseTo(record.density[1]);
		expect(decoded.density[2]).toBeCloseTo(record.density[2]);
		expect(decoded.placement).toBeCloseTo(record.placement);
		expect(decoded.prominence).toBeCloseTo(record.prominence);
		expect(decoded.vigor).toBeCloseTo(record.vigor);
	});

	it('computeVegetationGridSize matches M12.1 loop bounds', () => {
		const patch = {
			id: 'test',
			origin: [0, 0, 0] as const,
			tangentX: [1, 0, 0] as const,
			tangentY: [0, 1, 0] as const,
			widthMeters: 3,
			heightMeters: 3
		};

		expect(computeVegetationGridSize(patch, 1)).toEqual({
			gridWidth: 3,
			gridHeight: 3
		});
	});
});
