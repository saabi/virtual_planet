import { describe, expect, it } from 'vitest';
import { RUNTIME_WEBGPU_PACKAGE } from './index.js';

describe('@virtual-planet/runtime-webgpu scaffold', () => {
	it('exports its package identity', () => {
		expect(RUNTIME_WEBGPU_PACKAGE).toBe('@virtual-planet/runtime-webgpu');
	});
});
