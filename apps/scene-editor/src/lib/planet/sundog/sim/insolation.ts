import type { OrbitEnrichment } from '../enrichmentTypes.js';
import type { SunDogBody } from '../catalogTypes.js';
import { orbitPhaseAtTime, trueAnomalyFromPhase } from './orbitPhase.js';

const AU = 1.495978707e11;

/** Heliocentric distance (metres) at scene time t from kepler elements. */
export function orbitDistanceMeters(body: SunDogBody, t: number, orbit?: OrbitEnrichment): number {
	const a = (body.render.orbit.distanceToStarAu ?? 1) * AU;
	const e = orbit?.eccentricity ?? 0;
	const phase = orbitPhaseAtTime(body, t, orbit);
	const nu = trueAnomalyFromPhase(phase, e);
	return (a * (1 - e * e)) / (1 + e * Math.cos(nu));
}

/** Toy insolation factor ∝ 1/d² normalized to 1 at semi-major axis. */
export function insolationFactor(body: SunDogBody, t: number, orbit?: OrbitEnrichment): number {
	const a = (body.render.orbit.distanceToStarAu ?? 1) * AU;
	const d = orbitDistanceMeters(body, t, orbit);
	const r = d / a;
	return 1 / (r * r);
}

/** Qualitative season label from insolation vs mean. */
export function seasonLabel(body: SunDogBody, t: number, orbit?: OrbitEnrichment): string {
	const f = insolationFactor(body, t, orbit);
	if (f > 1.08) return 'summer (perihelion)';
	if (f < 0.92) return 'winter (aphelion)';
	return 'shoulder season';
}
