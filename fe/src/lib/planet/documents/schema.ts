import type { PlanetParameters } from '../params/planetParams.js';
import {
	defaultAtmosphereParams,
	type AtmosphereParameters
} from '../params/atmosphereParams.js';
import { DEFAULT_PRESET, PLANET_PRESETS, type PlanetPresetName } from '../params/presets.js';
import {
	altitudeToDistance,
	distanceToAltitude
} from '../camera/seaLevel.js';
import {
	CURRENT_SNAPSHOT_VERSION,
	type PlanetCameraState,
	type PlanetSnapshot
} from './types.js';

const PRESET_NAMES = Object.keys(PLANET_PRESETS) as PlanetPresetName[];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function coercePresetName(value: unknown): PlanetPresetName {
	if (typeof value === 'string' && (PRESET_NAMES as string[]).includes(value)) {
		return value as PlanetPresetName;
	}
	return DEFAULT_PRESET;
}

function coerceParams(raw: unknown, fallback: PlanetParameters): PlanetParameters {
	const src = isRecord(raw) ? raw : {};
	return {
		radius: finiteNumber(src.radius, fallback.radius),
		voronoi_scale: finiteNumber(src.voronoi_scale, fallback.voronoi_scale),
		voronoi_amplitude: finiteNumber(src.voronoi_amplitude, fallback.voronoi_amplitude),
		voronoi_albedo: finiteNumber(src.voronoi_albedo, fallback.voronoi_albedo),
		voronoi_albedo_y: finiteNumber(src.voronoi_albedo_y, fallback.voronoi_albedo_y),
		voronoi_albedo_z: finiteNumber(src.voronoi_albedo_z, fallback.voronoi_albedo_z),
		voronoi_distortion_scale: finiteNumber(
			src.voronoi_distortion_scale,
			fallback.voronoi_distortion_scale
		),
		voronoi_distortion_amplitude: finiteNumber(
			src.voronoi_distortion_amplitude,
			fallback.voronoi_distortion_amplitude
		),
		voronoi_distortion_albedo: finiteNumber(
			src.voronoi_distortion_albedo,
			fallback.voronoi_distortion_albedo
		),
		detail_scale: finiteNumber(src.detail_scale, fallback.detail_scale),
		detail_amplitude: finiteNumber(src.detail_amplitude, fallback.detail_amplitude),
		detail_albedo: finiteNumber(src.detail_albedo, fallback.detail_albedo),
		water_level: finiteNumber(src.water_level, fallback.water_level),
		render_water: finiteNumber(src.render_water, fallback.render_water),
		erosion: finiteNumber(src.erosion, fallback.erosion),
		sand_cutoff: finiteNumber(src.sand_cutoff, fallback.sand_cutoff),
		vegetation_level: finiteNumber(src.vegetation_level, fallback.vegetation_level),
		snow_cover: finiteNumber(src.snow_cover, fallback.snow_cover),
		texture_noise_scale: finiteNumber(src.texture_noise_scale, fallback.texture_noise_scale),
		texture_noise_amplitude: finiteNumber(
			src.texture_noise_amplitude,
			fallback.texture_noise_amplitude
		),
		polar_scale: finiteNumber(src.polar_scale, fallback.polar_scale),
		polar_amplitude: finiteNumber(src.polar_amplitude, fallback.polar_amplitude),
		illumination: finiteNumber(src.illumination, fallback.illumination)
	};
}

function coerceAtmosphere(
	raw: unknown,
	fallback: AtmosphereParameters
): AtmosphereParameters {
	const src = isRecord(raw) ? raw : {};
	return {
		shellHeightMeters: finiteNumber(src.shellHeightMeters, fallback.shellHeightMeters),
		scaleHeightMeters: finiteNumber(src.scaleHeightMeters, fallback.scaleHeightMeters),
		rayleighStrength: finiteNumber(src.rayleighStrength, fallback.rayleighStrength),
		mieStrength: finiteNumber(src.mieStrength, fallback.mieStrength),
		mieG: finiteNumber(src.mieG, fallback.mieG),
		groundFogDensity: finiteNumber(src.groundFogDensity, fallback.groundFogDensity),
		sunDiskIntensity: finiteNumber(src.sunDiskIntensity, fallback.sunDiskIntensity),
		integrateSteps: finiteNumber(src.integrateSteps, fallback.integrateSteps)
	};
}

function coerceCamera(
	raw: unknown,
	fallback: PlanetCameraState,
	params: PlanetParameters
): PlanetCameraState {
	const src = isRecord(raw) ? raw : {};
	const azimuth = finiteNumber(src.azimuth, fallback.azimuth);
	const elevation = finiteNumber(src.elevation, fallback.elevation);
	const orbitSpeedRadPerSec = finiteNumber(src.orbitSpeedRadPerSec, 0);
	const lookAtHorizon = typeof src.lookAtHorizon === 'boolean' ? src.lookAtHorizon : fallback.lookAtHorizon ?? true;

	const hasAltitude =
		typeof src.altitudeMeters === 'number' && Number.isFinite(src.altitudeMeters);
	const hasDistance = typeof src.distance === 'number' && Number.isFinite(src.distance);

	let altitudeMeters: number;
	let distance: number;
	if (hasAltitude) {
		altitudeMeters = src.altitudeMeters as number;
		distance = altitudeToDistance(params, altitudeMeters);
	} else if (hasDistance) {
		distance = src.distance as number;
		altitudeMeters = distanceToAltitude(params, distance);
	} else {
		distance = fallback.distance;
		altitudeMeters = distanceToAltitude(params, distance);
	}

	return {
		azimuth,
		elevation,
		distance,
		altitudeMeters,
		orbitSpeedRadPerSec,
		lookAtHorizon
	};
}

export function defaultSnapshot(): PlanetSnapshot {
	const params = { ...PLANET_PRESETS[DEFAULT_PRESET] };
	const distance = 320;
	return {
		schemaVersion: CURRENT_SNAPSHOT_VERSION,
		presetName: DEFAULT_PRESET,
		params,
		atmosphere: defaultAtmosphereParams(params.radius),
		camera: {
			azimuth: 0.6,
			elevation: 0.35,
			distance,
			altitudeMeters: distanceToAltitude(params, distance),
			orbitSpeedRadPerSec: 0,
			lookAtHorizon: true
		}
	};
}

export function coerceSnapshot(raw: unknown): PlanetSnapshot | null {
	if (!isRecord(raw)) return null;

	const defaults = defaultSnapshot();
	const presetName = coercePresetName(raw.presetName);
	const presetDefaults = PLANET_PRESETS[presetName];

	const paramsSource = isRecord(raw.params) ? raw.params : raw;
	const cameraSource = isRecord(raw.camera) ? raw.camera : {};

	const params = coerceParams(paramsSource, { ...presetDefaults });

	return {
		schemaVersion: CURRENT_SNAPSHOT_VERSION,
		presetName,
		params,
		atmosphere: coerceAtmosphere(raw.atmosphere, defaultAtmosphereParams(params.radius)),
		camera: coerceCamera(cameraSource, defaults.camera, params)
	};
}
