import { describe, expect, it } from 'vitest';
import { RUNTIME_WEBGPU_PACKAGE } from './index.js';

describe('@world-lab/runtime-webgpu scaffold', () => {
	it('exports its package identity', () => {
		expect(RUNTIME_WEBGPU_PACKAGE).toBe('@world-lab/runtime-webgpu');
	});
});
