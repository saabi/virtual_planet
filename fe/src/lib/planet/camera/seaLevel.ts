import type { AtmosphereParameters } from '../params/atmosphereParams.js';
import { defaultAtmosphereParams } from '../params/atmosphereParams.js';
import type { PlanetParameters } from '../params/planetParams.js';

export function terrainAmplitude(params: PlanetParameters): number {
	return params.voronoi_amplitude + params.detail_amplitude;
}

/** Radial offset of sea level from the reference sphere (matches GPU `wl`). */
export function seaLevelOffsetMeters(params: PlanetParameters): number {
	return terrainAmplitude(params) * (params.water_level - 0.5);
}

export function seaLevelRadius(params: PlanetParameters): number {
	return params.radius + seaLevelOffsetMeters(params);
}

export function altitudeToDistance(params: PlanetParameters, altitudeASL: number): number {
	return seaLevelRadius(params) + altitudeASL;
}

export function distanceToAltitude(params: PlanetParameters, distance: number): number {
	return distance - seaLevelRadius(params);
}

export interface AltitudeBounds {
	min: number;
	max: number;
}

export function altitudeBounds(
	params: PlanetParameters,
	atmosphere?: AtmosphereParameters
): AltitudeBounds {
	const amp = terrainAmplitude(params);
	const atmo = atmosphere ?? defaultAtmosphereParams(params.radius);
	const min = Math.max(amp * 0.02, 0.1);
	const max = Math.max(params.radius * 15, atmo.shellHeightMeters * 5, amp * 2);
	return { min, max: Math.max(max, min * 1.01) };
}

export function clampAltitude(
	params: PlanetParameters,
	altitudeASL: number,
	atmosphere?: AtmosphereParameters
): number {
	const { min, max } = altitudeBounds(params, atmosphere);
	return Math.max(min, Math.min(max, altitudeASL));
}

export function mapLogSlider(t01: number, min: number, max: number): number {
	const t = Math.max(0, Math.min(1, t01));
	if (max <= min) return min;
	if (min <= 0) {
		return min + t * (max - min);
	}
	const logMin = Math.log(min);
	const logMax = Math.log(max);
	return Math.exp(logMin + t * (logMax - logMin));
}

export function unmapLogSlider(altitude: number, min: number, max: number): number {
	if (max <= min) return 0;
	if (min <= 0) {
		return Math.max(0, Math.min(1, (altitude - min) / (max - min)));
	}
	const logMin = Math.log(min);
	const logMax = Math.log(max);
	const logAlt = Math.log(Math.max(altitude, min));
	return Math.max(0, Math.min(1, (logAlt - logMin) / (logMax - logMin)));
}

/** Multiplicative wheel step for altitude ASL. */
export function nudgeAltitudeASL(
	params: PlanetParameters,
	altitudeASL: number,
	wheelDelta: number,
	atmosphere?: AtmosphereParameters
): number {
	const factor = 1 + Math.sign(wheelDelta) * 0.08;
	const next = wheelDelta > 0 ? altitudeASL * factor : altitudeASL / factor;
	return clampAltitude(params, next, atmosphere);
}
