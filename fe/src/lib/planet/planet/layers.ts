import type { PlanetParameters } from '../params/planetParams.js';
import type { RenderMode, ScaleContext } from '../patches/types.js';

export interface TerrainLayer {
	id: string;
	minMetersPerPixel: number;
	enabled: boolean;
}

// minMetersPerPixel is calibrated at LAYER_REF_RADIUS; the gate scales it by radius so it
// is radius-relative (a ratio of radius), like the shader's should_eval_layer. These
// values are exactly the shader ratios × LAYER_REF_RADIUS (10, 5, 0.5, 0.05, 2 × 100).
export const TERRAIN_LAYERS: TerrainLayer[] = [
	{ id: 'voronoi', minMetersPerPixel: 1000, enabled: true },
	{ id: 'distortion', minMetersPerPixel: 500, enabled: true },
	{ id: 'detail', minMetersPerPixel: 50, enabled: true },
	{ id: 'texture_noise', minMetersPerPixel: 5, enabled: true },
	{ id: 'polar', minMetersPerPixel: 200, enabled: true }
];

/** Authoring reference radius the layer thresholds are calibrated at (R_ref). */
export const LAYER_REF_RADIUS = 100;

/**
 * Whether a terrain layer is visible at the current LOD. The threshold is a ratio of the
 * planet radius (scale-invariant), so it behaves the same at any world scale — at
 * `radius = LAYER_REF_RADIUS` it reproduces the original absolute thresholds exactly,
 * and at world scale it grows so fine layers aren't wrongly culled. Mirrors the shader's
 * should_eval_layer (kernel.wgsl). See renderer-unification-plan §3.1.
 */
export function shouldEvalLayer(layer: TerrainLayer, scale: ScaleContext, radius: number): boolean {
	if (!layer.enabled) return false;
	return scale.metersPerPixel <= layer.minMetersPerPixel * (radius / LAYER_REF_RADIUS);
}

export function buildScaleContext(
	mode: RenderMode,
	altitudeMeters: number,
	distanceMeters: number,
	focalLengthPx: number,
	viewportHeightPx: number
): ScaleContext {
	const metersPerPixel = (2 * distanceMeters * Math.tan(Math.PI / 6)) / viewportHeightPx;
	return {
		cameraAltitudeMeters: altitudeMeters,
		distanceToCameraMeters: distanceMeters,
		metersPerPixel,
		maxFeatureFrequency: 1 / Math.max(metersPerPixel, 0.001),
		mode
	};
}

export function gatedParams(params: PlanetParameters, scale: ScaleContext): PlanetParameters {
	const p = { ...params };
	if (!shouldEvalLayer(TERRAIN_LAYERS[2], scale, params.radius)) {
		p.detail_scale = 0;
		p.detail_amplitude = 0;
	}
	if (!shouldEvalLayer(TERRAIN_LAYERS[1], scale, params.radius)) {
		p.voronoi_distortion_scale = 0;
		p.voronoi_distortion_amplitude = 0;
	}
	if (!shouldEvalLayer(TERRAIN_LAYERS[3], scale, params.radius)) {
		p.texture_noise_scale = 0;
		p.texture_noise_amplitude = 0;
	}
	return p;
}
