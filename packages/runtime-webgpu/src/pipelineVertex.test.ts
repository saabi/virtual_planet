import { describe, expect, it } from 'vitest';

import { STANDARD_LIBRARY_MODULES } from '@world-lab/procedural-wgsl';

import {
	assemblePipelineVertexWgsl,
	DEFAULT_PIPELINE_GEOMETRY_PARAMS,
	planeGridVertexCount
} from './pipelineVertex.js';

describe('@world-lab/runtime-webgpu pipelineVertex', () => {
	it('assembles a @vertex entry that calls plane_grid_position with baked geometry params', () => {
		const planeSource = STANDARD_LIBRARY_MODULES['geometry.plane']!.source;
		const code = assemblePipelineVertexWgsl(DEFAULT_PIPELINE_GEOMETRY_PARAMS, planeSource);
		expect(code).toContain('fn plane_grid_position(');
		expect(code).toContain('plane_grid_position(vid, 2u, 2u, 2.0, 2.0, 0.0, 0.0, 0.0)');
		expect(code).toContain('@vertex');
		expect(code).toContain('fn vs_main');
	});

	it('bakes non-default width, height, and rotation into the vertex call', () => {
		const planeSource = STANDARD_LIBRARY_MODULES['geometry.plane']!.source;
		const code = assemblePipelineVertexWgsl(
			{
				resU: 2,
				resV: 2,
				width: 4,
				height: 2,
				rotationX: 1.5,
				rotationY: 0,
				rotationZ: 0
			},
			planeSource
		);
		expect(code).toContain('plane_grid_position(vid, 2u, 2u, 4.0, 2.0, 1.5, 0.0, 0.0)');
	});

	it('counts triangle-list vertices from the plane grid resolution', () => {
		expect(planeGridVertexCount(2, 2)).toBe(6);
		expect(planeGridVertexCount(4, 4)).toBe(54);
	});
});
