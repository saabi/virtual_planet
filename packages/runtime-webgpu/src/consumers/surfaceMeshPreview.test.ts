import { describe, expect, it } from 'vitest';
import { buildSurfaceMesh } from '../surfaceMesh.js';
import { renderSurfaceMeshPreview } from './surfaceMeshPreview.js';

const hasWebGPU =
	typeof globalThis.navigator !== 'undefined' &&
	'gpu' in globalThis.navigator &&
	globalThis.navigator.gpu !== undefined;

describe('@virtual-planet/runtime-webgpu surfaceMeshPreview', () => {
	it.skipIf(!hasWebGPU)('renders plane and cube-sphere meshes with different topology', async () => {
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
