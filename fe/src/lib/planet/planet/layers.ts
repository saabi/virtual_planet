import type { PlanetParameters } from '../params/planetParams.js';
import type { RenderMode, ScaleContext } from '../patches/types.js';

export interface TerrainLayer {
	id: string;
	minMetersPerPixel: number;
	enabled: boolean;
}

export const TERRAIN_LAYERS: TerrainLayer[] = [
	{ id: 'voronoi', minMetersPerPixel: 1000, enabled: true },
	{ id: 'distortion', minMetersPerPixel: 500, enabled: true },
	{ id: 'detail', minMetersPerPixel: 50, enabled: true },
	{ id: 'texture_noise', minMetersPerPixel: 5, enabled: true },
	{ id: 'polar', minMetersPerPixel: 200, enabled: true }
];

export function shouldEvalLayer(layer: TerrainLayer, scale: ScaleContext): boolean {
	if (!layer.enabled) return false;
	return scale.metersPerPixel <= layer.minMetersPerPixel;
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
	if (!shouldEvalLayer(TERRAIN_LAYERS[2], scale)) {
		p.detail_scale = 0;
		p.detail_amplitude = 0;
	}
	if (!shouldEvalLayer(TERRAIN_LAYERS[1], scale)) {
		p.voronoi_distortion_scale = 0;
		p.voronoi_distortion_amplitude = 0;
	}
	if (!shouldEvalLayer(TERRAIN_LAYERS[3], scale)) {
		p.texture_noise_scale = 0;
		p.texture_noise_amplitude = 0;
	}
	return p;
}
