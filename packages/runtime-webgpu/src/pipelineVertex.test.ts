import { describe, expect, it } from 'vitest';

import { STANDARD_LIBRARY_MODULES } from '@virtual-planet/procedural-wgsl';

import { assemblePipelineVertexWgsl, planeGridVertexCount } from './pipelineVertex.js';

describe('@virtual-planet/runtime-webgpu pipelineVertex', () => {
	it('assembles a @vertex entry that calls plane_grid_position with baked resolution', () => {
		const planeSource = STANDARD_LIBRARY_MODULES['geometry.plane']!.source;
		const code = assemblePipelineVertexWgsl(2, 2, planeSource);
		expect(code).toContain('fn plane_grid_position(');
		expect(code).toContain('plane_grid_position(vid, 2u, 2u)');
		expect(code).toContain('@vertex');
		expect(code).toContain('fn vs_main');
	});

	it('counts triangle-list vertices from the plane grid resolution', () => {
		expect(planeGridVertexCount(2, 2)).toBe(6);
		expect(planeGridVertexCount(4, 4)).toBe(54);
	});
});
