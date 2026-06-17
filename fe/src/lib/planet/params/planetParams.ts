import type { RenderMode } from '../patches/types.js';

/** Serializable planet procedural parameters (matches legacy presets). */
export interface PlanetParameters {
	radius: number;
	voronoi_scale: number;
	voronoi_amplitude: number;
	voronoi_albedo: number;
	voronoi_albedo_y: number;
	voronoi_albedo_z: number;
	voronoi_distortion_scale: number;
	voronoi_distortion_amplitude: number;
	voronoi_distortion_albedo: number;
	detail_scale: number;
	detail_amplitude: number;
	detail_albedo: number;
	water_level: number;
	render_water: number;
	erosion: number;
	sand_cutoff: number;
	vegetation_level: number;
	snow_cover: number;
	texture_noise_scale: number;
	texture_noise_amplitude: number;
	polar_scale: number;
	polar_amplitude: number;
	illumination: number;
}

/** GPU uniform block — 16-byte aligned, mirrors planet/params.wgsl */
export interface GpuPlanetParams {
	radius: number;
	voronoi_scale: number;
	voronoi_amplitude: number;
	voronoi_albedo: number;
	voronoi_albedo_y: number;
	voronoi_albedo_z: number;
	voronoi_distortion_scale: number;
	voronoi_distortion_amplitude: number;
	voronoi_distortion_albedo: number;
	detail_scale: number;
	detail_amplitude: number;
	detail_albedo: number;
	water_level: number;
	render_water: number;
	erosion: number;
	sand_cutoff: number;
	vegetation_level: number;
	snow_cover: number;
	texture_noise_scale: number;
	texture_noise_amplitude: number;
	polar_scale: number;
	polar_amplitude: number;
	illumination: number;
	time: number;
	_pad0: number;
	_pad1: number;
	_pad2: number;
}

export interface GpuScaleContext {
	camera_altitude_meters: number;
	distance_to_camera_meters: number;
	meters_per_pixel: number;
	max_feature_frequency: number;
	mode: number; // 0 orbit, 1 flight, 2 surface
	_pad0: number;
	_pad1: number;
	_pad2: number;
}

export interface GpuLocalFrame {
	origin_ecef: [number, number, number, number];
	east: [number, number, number, number];
	north: [number, number, number, number];
	up: [number, number, number, number];
	planet_center_local: [number, number, number, number];
	camera_local: [number, number, number, number];
}

export const PLANET_PARAMS_BYTE_SIZE = 128;
export const SCALE_CONTEXT_BYTE_SIZE = 32;
export const LOCAL_FRAME_BYTE_SIZE = 96;
export const CUBE_SPHERE_PATCH_BYTE_SIZE = 32;

export function toGpuPlanetParams(p: PlanetParameters, time = 0): GpuPlanetParams {
	return {
		radius: p.radius,
		voronoi_scale: p.voronoi_scale,
		voronoi_amplitude: p.voronoi_amplitude,
		voronoi_albedo: p.voronoi_albedo,
		voronoi_albedo_y: p.voronoi_albedo_y,
		voronoi_albedo_z: p.voronoi_albedo_z,
		voronoi_distortion_scale: p.voronoi_distortion_scale,
		voronoi_distortion_amplitude: p.voronoi_distortion_amplitude,
		voronoi_distortion_albedo: p.voronoi_distortion_albedo,
		detail_scale: p.detail_scale,
		detail_amplitude: p.detail_amplitude,
		detail_albedo: p.detail_albedo,
		water_level: p.water_level,
		render_water: p.render_water,
		erosion: p.erosion,
		sand_cutoff: p.sand_cutoff,
		vegetation_level: p.vegetation_level,
		snow_cover: p.snow_cover,
		texture_noise_scale: p.texture_noise_scale,
		texture_noise_amplitude: p.texture_noise_amplitude,
		polar_scale: p.polar_scale,
		polar_amplitude: p.polar_amplitude,
		illumination: p.illumination,
		time,
		_pad0: 0,
		_pad1: 0,
		_pad2: 0
	};
}

export function renderModeToGpu(mode: RenderMode): number {
	switch (mode) {
		case 'orbit':
			return 0;
		case 'flight':
			return 1;
		case 'surface':
			return 2;
	}
}

export function writePlanetParamsToBuffer(
	buffer: ArrayBuffer,
	offset: number,
	params: GpuPlanetParams
): void {
	const view = new DataView(buffer, offset, PLANET_PARAMS_BYTE_SIZE);
	const f = (i: number, v: number) => view.setFloat32(i * 4, v, true);
	f(0, params.radius);
	f(1, params.voronoi_scale);
	f(2, params.voronoi_amplitude);
	f(3, params.voronoi_albedo);
	f(4, params.voronoi_albedo_y);
	f(5, params.voronoi_albedo_z);
	f(6, params.voronoi_distortion_scale);
	f(7, params.voronoi_distortion_amplitude);
	f(8, params.voronoi_distortion_albedo);
	f(9, params.detail_scale);
	f(10, params.detail_amplitude);
	f(11, params.detail_albedo);
	f(12, params.water_level);
	f(13, params.render_water);
	f(14, params.erosion);
	f(15, params.sand_cutoff);
	f(16, params.vegetation_level);
	f(17, params.snow_cover);
	f(18, params.texture_noise_scale);
	f(19, params.texture_noise_amplitude);
	f(20, params.polar_scale);
	f(21, params.polar_amplitude);
	f(22, params.illumination);
	f(23, params.time);
	f(24, params._pad0);
	f(25, params._pad1);
	f(26, params._pad2);
}
