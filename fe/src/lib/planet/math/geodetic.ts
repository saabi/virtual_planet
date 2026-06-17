import type { Vec3d } from './vec.js';

/** WGS84-like ellipsoid for geodetic conversions (meters). */
export const WGS84_A = 6_378_137;
export const WGS84_F = 1 / 298.257223563;
export const WGS84_E2 = WGS84_F * (2 - WGS84_F);

export interface GeodeticPosition {
	latRad: number;
	lonRad: number;
	altitudeMeters: number;
}

export function geodeticToEcef(g: GeodeticPosition): Vec3d {
	const cosLat = Math.cos(g.latRad);
	const sinLat = Math.sin(g.latRad);
	const cosLon = Math.cos(g.lonRad);
	const sinLon = Math.sin(g.lonRad);
	const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
	const x = (n + g.altitudeMeters) * cosLat * cosLon;
	const y = (n + g.altitudeMeters) * cosLat * sinLon;
	const z = (n * (1 - WGS84_E2) + g.altitudeMeters) * sinLat;
	return [x, y, z];
}

export function ecefToGeodetic(p: Vec3d): GeodeticPosition {
	const x = p[0];
	const y = p[1];
	const z = p[2];
	const lonRad = Math.atan2(y, x);
	const pXY = Math.hypot(x, y);

	let latRad = Math.atan2(z, pXY * (1 - WGS84_E2));
	for (let i = 0; i < 6; i++) {
		const sinLat = Math.sin(latRad);
		const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
		latRad = Math.atan2(z + WGS84_E2 * n * sinLat, pXY);
	}
	const sinLat = Math.sin(latRad);
	const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
	const altitudeMeters = pXY / Math.cos(latRad) - n;
	return { latRad, lonRad, altitudeMeters };
}
