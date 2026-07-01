import { describe, expect, it } from 'vitest';
import { buildSurfaceMesh } from '../surfaceMesh.js';
import { renderSurfaceMeshPreview } from './surfaceMeshPreview.js';
import { shouldSkipWebGpuCanvasTest } from '../testSupport/webgpuTestEnv.js';

describe('@world-lab/runtime-webgpu surfaceMeshPreview', () => {
	it.skipIf(shouldSkipWebGpuCanvasTest())('renders plane and cube-sphere meshes with different topology', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();

		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;

		await renderSurfaceMeshPreview({ device, canvas, surfaceId: 'surface.plane', gridSize: 4 });
		const planeMesh = buildSurfaceMesh('surface.plane', 4);

		await renderSurfaceMeshPreview({ device, canvas, surfaceId: 'surface.cubeSphere', gridSize: 4 });
		const sphereMesh = buildSurfaceMesh('surface.cubeSphere', 4);

		expect(sphereMesh.vertexCount).toBeGreaterThan(planeMesh.vertexCount);
		device.destroy();
	});
});
