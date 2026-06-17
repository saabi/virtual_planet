import { geodeticToEcef, ecefToGeodetic, type GeodeticPosition } from './geodetic.js';
import type { Vec3, Vec3d } from './vec.js';
import { dot3d, sub3d } from './vec.js';

export function geodeticEcefRoundTrip(g: GeodeticPosition, tol = 0.5): boolean {
	const ecef = geodeticToEcef(g);
	const back = ecefToGeodetic(ecef);
	return (
		Math.abs(back.latRad - g.latRad) < 1e-6 &&
		Math.abs(back.lonRad - g.lonRad) < 1e-6 &&
		Math.abs(back.altitudeMeters - g.altitudeMeters) < tol
	);
}

export function ecefToLocalFloat(p: Vec3d, origin: Vec3d, east: Vec3d, north: Vec3d, up: Vec3d): Vec3 {
	const d = sub3d(p, origin);
	return [dot3d(d, east), dot3d(d, north), dot3d(d, up)];
}
