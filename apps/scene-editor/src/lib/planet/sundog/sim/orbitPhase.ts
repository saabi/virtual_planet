import type { OrbitEnrichment } from '../enrichmentTypes.js';
import type { SunDogBody } from '../catalogTypes.js';

/** Normalized mean anomaly [0, 2π) at scene time t (seconds). */
export function orbitPhaseAtTime(body: SunDogBody, t: number, orbit?: OrbitEnrichment): number {
	const periodDays = body.render.orbit.orbitPeriodDays ?? 365;
	const periodSeconds = periodDays; // 1 scene-second per game-day
	const omega = (2 * Math.PI) / periodSeconds;
	return ((omega * t) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
}

/** True anomaly proxy from mean anomaly (circular-ish shortcut for toy sim). */
export function trueAnomalyFromPhase(phase: number, eccentricity: number): number {
	if (eccentricity < 1e-6) return phase;
	// First-order eccentric anomaly approximation for small e.
	const E = phase;
	return E + 2 * eccentricity * Math.sin(E);
}
