import { describe, expect, it } from 'vitest';
import { PlanetRenderer, type PlanetRenderInputs } from './planetRenderer.js';
import { createOrbitCamera } from '../camera/orbitCamera.js';
import { PLANET_PRESETS, DEFAULT_PRESET } from '../params/presets.js';
import { DEFAULT_TESSELLATION } from '../patches/tessellationSettings.js';
import { DEFAULT_MATERIAL_OVERRIDES } from '../material/biomes.js';
import { defaultAtmosphereParams } from '../params/atmosphereParams.js';
import type { RenderBackend, RenderFrame, RenderStats } from './RenderBackend.js';
import type { LightingUniforms } from './uniformLayouts.js';

function mockBackend(captured: RenderFrame[]): RenderBackend {
	return {
		kind: 'webgpu',
		init: async () => {},
		resize: () => {},
		render: (f: RenderFrame) => {
			captured.push(f);
			return {} as RenderStats;
		},
		destroy: () => {}
	} as RenderBackend;
}

describe('PlanetRenderer', () => {
	it('drives buildRenderFrame → backend.render with external params', () => {
		const params = PLANET_PRESETS[DEFAULT_PRESET];
		const frames: RenderFrame[] = [];
		const renderer = new PlanetRenderer(mockBackend(frames));
		const camera = createOrbitCamera({
			distance: params.radius * 3,
			azimuth: 0.4,
			elevation: 0.2,
			fovDeg: 60,
			aspect: 1.6,
			near: 0.1,
			far: params.radius * 20,
			planetRadius: params.radius
		});
		const input: PlanetRenderInputs = {
			time: 0,
			camera,
			width: 800,
			height: 600,
			params,
			tessellation: DEFAULT_TESSELLATION,
			debug: { wireframe: false, faceColors: false, showPatchBorders: false, showRingColors: false },
			lighting: {} as LightingUniforms,
			materialOverrides: DEFAULT_MATERIAL_OVERRIDES,
			atmosphere: defaultAtmosphereParams(params.radius),
			planetRotation: [0, 0, 0, 1]
		};
		renderer.render(input);
		renderer.render({ ...input, time: 1 });

		expect(frames).toHaveLength(2);
		expect(frames[0].params).toBe(params);
		expect(frames[1].time).toBe(1);
	});
});
