import { expect } from 'vitest';

/** Whether a WebGPU implementation is visible to tests (browser or Node binding). */
export const hasWebGPU =
	typeof globalThis.navigator !== 'undefined' &&
	'gpu' in globalThis.navigator &&
	globalThis.navigator.gpu !== undefined;

export const requireWebGPU =
	typeof process !== 'undefined' && process.env.REQUIRE_WEBGPU === '1';

/** Use with `it.skipIf(shouldSkipWebGPUTest())`. */
export function shouldSkipWebGPUTest(): boolean {
	return !hasWebGPU;
}

/** Canvas `getContext('webgpu')` — available in browsers, not in the Node Dawn binding. */
export function hasWebGpuCanvas(): boolean {
	if (typeof document === 'undefined') return false;
	const canvas = document.createElement('canvas');
	return canvas.getContext('webgpu') !== null;
}

export function shouldSkipWebGpuCanvasTest(): boolean {
	return shouldSkipWebGPUTest() || !hasWebGpuCanvas();
}

export async function validateShaderModule(code: string, label?: string): Promise<string[]> {
	const adapter = await navigator.gpu!.requestAdapter();
	if (!adapter) {
		throw new Error('requestAdapter returned null');
	}
	const device = await adapter.requestDevice();
	try {
		const module = device.createShaderModule({ code, label });
		const info = await module.getCompilationInfo();
		return info.messages
			.filter((message) => message.type === 'error')
			.map((message) => message.message);
	} finally {
		device.destroy();
	}
}

export async function expectShaderCompiles(code: string, label?: string): Promise<void> {
	const errors = await validateShaderModule(code, label);
	expect(errors, errors.join('; ')).toEqual([]);
}
