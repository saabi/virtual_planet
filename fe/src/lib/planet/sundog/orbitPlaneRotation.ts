import type { Quat } from '../scene/types.js';
import { eulerToQuat } from '../scene/transform.js';

const DEG = Math.PI / 180;

/**
 * Quaternion for a kepler-orbit group's `transform.rotation`: LAN about +Y, then
 * inclination about +X (tilts the default XZ orbital plane). Applied on the
 * kepler-orbit group node, not the body.
 */
export function orbitPlaneRotation(inclinationDeg: number, ascendingNodeDeg = 0): Quat {
	const lan = ascendingNodeDeg * DEG;
	const inc = inclinationDeg * DEG;
	return eulerToQuat(inc, lan, 0);
}
