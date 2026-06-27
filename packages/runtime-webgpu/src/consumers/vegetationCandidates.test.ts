import '@virtual-planet/graph';
import { generateVegetationCandidates } from '@virtual-planet/runtime-cpu';
import { describe, expect, it } from 'vitest';

import { executeVegetationCandidateCompute } from './vegetationCandidates.js';
import {
	cpuSamplersFromParityModules,
	PARITY_CONFIG,
	PARITY_DENSITY_GRAPH,
	PARITY_PATCH,
	PARITY_PLACEMENT_GRAPH,
	PARITY_PLATEAU_PLACEMENT_GRAPH,
	parityResolver
} from '../fixtures/vegetationParity.js';
import type { VegetationCandidateGpuRecord } from '../vegetationTypes.js';

const hasWebGPU =
	typeof globalThis.navigator !== 'undefined' &&
	'gpu' in globalThis.navigator &&
	globalThis.navigator.gpu !== undefined;

function recordsEqualModuloId(
	gpuRecords: VegetationCandidateGpuRecord[],
	cpuRecords: ReturnType<typeof generateVegetationCandidates>
): boolean {
	if (gpuRecords.length !== cpuRecords.length) return false;
	for (let index = 0; index < gpuRecords.length; index += 1) {
		const gpu = gpuRecords[index]!;
		const cpu = cpuRecords[index]!;
		const expectedId = `${PARITY_PATCH.id}:${gpu.ix}:${gpu.iy}:${gpu.channel}`;
		if (cpu.id !== expectedId) return false;
		if (gpu.ix !== Number.parseInt(cpu.id.split(':')[1] ?? '', 10)) return false;
		if (gpu.position[0] !== cpu.position[0]) return false;
		if (gpu.position[1] !== cpu.position[1]) return false;
		if (gpu.position[2] !== cpu.position[2]) return false;
		if (gpu.localMeters[0] !== cpu.localMeters[0]) return false;
		if (gpu.localMeters[1] !== cpu.localMeters[1]) return false;
		if (gpu.density[0] !== cpu.density[0]) return false;
		if (gpu.density[1] !== cpu.density[1]) return false;
		if (gpu.density[2] !== cpu.density[2]) return false;
		if (gpu.placement !== cpu.placement) return false;
		if (gpu.prominence !== cpu.prominence) return false;
		if (gpu.vigor !== cpu.vigor) return false;
	}
	return true;
}

async function withGpuDevice<T>(run: (device: GPUDevice) => Promise<T>): Promise<T> {
	const adapter = await navigator.gpu.requestAdapter();
	expect(adapter).toBeTruthy();
	const device = await adapter!.requestDevice();
	try {
		return await run(device);
	} finally {
		device.destroy();
	}
}

describe('@virtual-planet/runtime-webgpu vegetationCandidates', () => {
	it('throws RangeError for invalid patch width', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: { ...PARITY_PATCH, widthMeters: 0 },
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError for non-unit tangentX', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: { ...PARITY_PATCH, tangentX: [2, 0, 0] },
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError for invalid spacingMeters', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: PARITY_PATCH,
				config: { ...PARITY_CONFIG, spacingMeters: 0 },
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError for invalid channel', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: PARITY_PATCH,
				config: { ...PARITY_CONFIG, channel: 3 as never },
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError for negative maxCandidates', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: -1
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError when placementThreshold is out of range', async () => {
		await expect(
			executeVegetationCandidateCompute({
				device: {} as GPUDevice,
				patch: PARITY_PATCH,
				config: { ...PARITY_CONFIG, placementThreshold: 1.5 },
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16
			})
		).rejects.toThrow(RangeError);
	});

	it.skipIf(!hasWebGPU)('GPU parity with CPU two-peak fixture', async () => {
		await withGpuDevice(async (device) => {
			const cpu = generateVegetationCandidates(
				PARITY_PATCH,
				PARITY_CONFIG,
				cpuSamplersFromParityModules()
			);
			const gpu = await executeVegetationCandidateCompute({
				device,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 16,
				moduleResolver: parityResolver()
			});

			expect(gpu.overflowed).toBe(false);
			expect(gpu.candidateCount).toBe(2);
			expect(recordsEqualModuloId(gpu.candidates, cpu)).toBe(true);
		});
	});

	it.skipIf(!hasWebGPU)('plateau placement produces zero candidates', async () => {
		await withGpuDevice(async (device) => {
			const gpu = await executeVegetationCandidateCompute({
				device,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLATEAU_PLACEMENT_GRAPH,
					output: { node: 'n_plateau', port: 'value' }
				},
				maxCandidates: 16,
				moduleResolver: parityResolver()
			});

			expect(gpu.candidateCount).toBe(0);
			expect(gpu.overflowed).toBe(false);
		});
	});

	it.skipIf(!hasWebGPU)('reports overflow when maxCandidates is 1', async () => {
		await withGpuDevice(async (device) => {
			const cpu = generateVegetationCandidates(
				PARITY_PATCH,
				PARITY_CONFIG,
				cpuSamplersFromParityModules()
			);
			const gpu = await executeVegetationCandidateCompute({
				device,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				maxCandidates: 1,
				moduleResolver: parityResolver()
			});

			expect(gpu.overflowed).toBe(true);
			expect(gpu.candidateCount).toBe(1);
			expect(gpu.candidates[0]!.position).toEqual(cpu[0]!.position);
			expect(gpu.candidates[0]!.localMeters).toEqual(cpu[0]!.localMeters);
			expect(gpu.candidates[0]!.vigor).toBe(cpu[0]!.vigor);
		});
	});
});
