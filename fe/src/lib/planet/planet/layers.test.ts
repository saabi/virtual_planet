import { describe, expect, it } from 'vitest';
import { buildScaleContext, gatedParams, shouldEvalLayer, TERRAIN_LAYERS } from './layers.js';
import { PLANET_PRESETS } from '../params/presets.js';

const preset = PLANET_PRESETS.starter;
const base = { ...preset, voronoi_distortion_scale: 4, voronoi_distortion_amplitude: 20, detail_scale: 8, texture_noise_scale: 2 };

// A scale context whose meters-per-pixel matches viewing each radius from a few radii out.
function scaleAtRadius(radius: number) {
	const distance = radius * 3; // a typical orbit framing
	return buildScaleContext('orbit', distance - radius, distance, 900, 800);
}

describe('terrain layer LOD gating is radius-relative', () => {
	it('keeps warp/detail/texture at the same framing regardless of radius', () => {
		// /planet (radius 100) and /scene (radius 5e5) view the body from the same number
		// of radii — the fine layers must survive in both, else /scene renders a smoother
		// planet and sliders like Warp Scale do nothing (the reported bug).
		const small = gatedParams({ ...base, radius: 100 }, scaleAtRadius(100));
		const world = gatedParams({ ...base, radius: 5e5 }, scaleAtRadius(5e5));
		for (const p of [small, world]) {
			expect(p.voronoi_distortion_scale).toBe(4);
			expect(p.voronoi_distortion_amplitude).toBe(20);
			expect(p.detail_scale).toBe(8);
			expect(p.texture_noise_scale).toBe(2);
		}
	});

	it('a fixed mpp that culls warp at radius 100 keeps it at world scale', () => {
		// mpp = 1400 m/px: above the distortion threshold (500) at radius 100, but well
		// under it (500 × 5e5/100 = 2.5e6) at world scale.
		const scale = { ...scaleAtRadius(100), metersPerPixel: 1400 };
		expect(shouldEvalLayer(TERRAIN_LAYERS[1], scale, 100)).toBe(false);
		expect(shouldEvalLayer(TERRAIN_LAYERS[1], scale, 5e5)).toBe(true);

		expect(gatedParams({ ...base, radius: 100 }, scale).voronoi_distortion_scale).toBe(0);
		expect(gatedParams({ ...base, radius: 5e5 }, scale).voronoi_distortion_scale).toBe(4);
	});

	it('still culls fine layers when truly zoomed out (very high mpp at world scale)', () => {
		// At radius 5e5 the distortion threshold is 2.5e6 m/px; beyond it, warp is culled.
		const scale = { ...scaleAtRadius(5e5), metersPerPixel: 1e7 };
		expect(gatedParams({ ...base, radius: 5e5 }, scale).voronoi_distortion_scale).toBe(0);
		expect(gatedParams({ ...base, radius: 5e5 }, scale).detail_scale).toBe(0);
	});
});
