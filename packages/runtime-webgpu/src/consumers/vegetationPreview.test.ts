import '@world-lab/graph';
import { describe, expect, it } from 'vitest';

import { renderVegetationPreview } from './vegetationPreview.js';
import {
	PARITY_CONFIG,
	PARITY_DENSITY_GRAPH,
	PARITY_PATCH,
	PARITY_PLACEMENT_GRAPH,
	parityResolver
} from '../fixtures/vegetationParity.js';
import { shouldSkipWebGpuCanvasTest } from '../testSupport/webgpuTestEnv.js';

describe('@world-lab/runtime-webgpu renderVegetationPreview', () => {
	it('throws RangeError for invalid patch dimensions', async () => {
		await expect(
			renderVegetationPreview({
				device: {} as GPUDevice,
				canvas: {} as HTMLCanvasElement,
				patch: { ...PARITY_PATCH, widthMeters: 0 },
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 100
			})
		).rejects.toThrow(RangeError);
	});

	it('throws RangeError for invalid channel config', async () => {
		await expect(
			renderVegetationPreview({
				device: {} as GPUDevice,
				canvas: {} as HTMLCanvasElement,
				patch: PARITY_PATCH,
				config: { ...PARITY_CONFIG, channel: 4 as any },
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 100
			})
		).rejects.toThrow(RangeError);
	});

	it.skipIf(shouldSkipWebGpuCanvasTest())('runs successfully in none mode (altitude >= 2000)', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();
		try {
			// Mock canvas since offscreen/headless tests might not support getContext('webgpu')
			// We can create a real canvas element in the browser context
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;

			const result = await renderVegetationPreview({
				device,
				canvas,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 2500,
				moduleResolver: parityResolver()
			});

			expect(result.mode).toBe('none');
			expect(result.candidateCount).toBe(0);
		} finally {
			device.destroy();
		}
	});

	it.skipIf(shouldSkipWebGpuCanvasTest())('runs successfully in statistical mode (500 <= altitude < 2000)', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;

			const result = await renderVegetationPreview({
				device,
				canvas,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 1000,
				moduleResolver: parityResolver()
			});

			expect(result.mode).toBe('statistical');
			expect(result.candidateCount).toBe(0);
		} finally {
			device.destroy();
		}
	});

	it.skipIf(shouldSkipWebGpuCanvasTest())('runs successfully in impostor mode (150 <= altitude < 500)', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;

			const result = await renderVegetationPreview({
				device,
				canvas,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 300,
				moduleResolver: parityResolver()
			});

			expect(result.mode).toBe('impostor');
			expect(result.candidateCount).toBe(2);
			expect(result.candidates.length).toBe(2);
		} finally {
			device.destroy();
		}
	});

	it.skipIf(shouldSkipWebGpuCanvasTest())('runs successfully in full mode (altitude < 150)', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;

			const result = await renderVegetationPreview({
				device,
				canvas,
				patch: PARITY_PATCH,
				config: PARITY_CONFIG,
				density: { graph: PARITY_DENSITY_GRAPH, output: { node: 'n_density', port: 'density' } },
				placement: {
					graph: PARITY_PLACEMENT_GRAPH,
					output: { node: 'n_placement', port: 'value' }
				},
				altitudeMeters: 50,
				moduleResolver: parityResolver()
			});

			expect(result.mode).toBe('full');
			expect(result.candidateCount).toBe(2);
			expect(result.candidates.length).toBe(2);
		} finally {
			device.destroy();
		}
	});
});
