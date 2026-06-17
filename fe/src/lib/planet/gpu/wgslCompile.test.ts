/// <reference types="@webgpu/types" />
import { describe, expect, it } from 'vitest';
import cubeSphereShader from '../gpu/wgsl/terrain/cubeSphereVertex.wgsl';
import kernelShader from '../gpu/wgsl/planet/kernel.wgsl';

const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

describe('WGSL compile', () => {
	it.skipIf(!hasWebGPU)('compiles cube-sphere terrain shader', async () => {
		const adapter = await navigator.gpu!.requestAdapter();
		expect(adapter).toBeTruthy();
		const device = await adapter!.requestDevice();
		const module = device.createShaderModule({ code: cubeSphereShader });
		const info = await module.getCompilationInfo();
		const errors = info.messages.filter((m) => m.type === 'error');
		expect(errors).toEqual([]);
		device.destroy();
	});

	it.skipIf(!hasWebGPU)('compiles planet kernel module', async () => {
		const adapter = await navigator.gpu!.requestAdapter();
		const device = await adapter!.requestDevice();
		const wrapped = `
struct PlanetParams { radius: f32, _pad: vec3f }
struct ScaleContext { meters_per_pixel: f32, _pad: vec3f }
${kernelShader}
`;
		const module = device.createShaderModule({ code: wrapped });
		const info = await module.getCompilationInfo();
		const errors = info.messages.filter((m) => m.type === 'error');
		expect(errors).toEqual([]);
		device.destroy();
	});
});
