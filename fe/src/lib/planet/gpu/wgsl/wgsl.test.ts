import { describe, expect, it } from 'vitest';
import { resolveWgslIncludes } from '../resolveWgslIncludes.js';
import path from 'node:path';

const KERNEL = path.resolve('src/lib/planet/gpu/wgsl/planet/kernel.wgsl');

describe('WGSL includes', () => {
	it('resolves kernel module', () => {
		const src = resolveWgslIncludes(KERNEL);
		expect(src).toContain('fn sample_planet');
		expect(src).toContain('fn fbm_4');
	});
});

describe('WGSL compile', () => {
	it.skipIf(!globalThis.navigator?.gpu)('compiles terrain shader on WebGPU', async () => {
		const adapter = await navigator.gpu!.requestAdapter();
		if (!adapter) return;
		const device = await adapter.requestDevice();
		const src = resolveWgslIncludes(
			path.resolve('src/lib/planet/gpu/wgsl/terrain/cubeSphereVertex.wgsl')
		);
		const module = device.createShaderModule({ code: src });
		const info = await module.getCompilationInfo();
		const errors = info.messages.filter((m) => m.type === 'error');
		expect(errors).toHaveLength(0);
		device.destroy();
	});
});
