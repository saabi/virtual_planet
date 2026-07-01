// SunDog enrichment — Tier-1 authored overlay on the extracted catalog.
// See _docs/specs/sundog-enrichment.md.

import type { PlanetPresetName } from '../params/presets.js';
import type { PlanetParameters } from '../params/planetParams.js';
import type { Provenance } from './catalogTypes.js';

export type Seasonality = 'low' | 'medium' | 'high';

/** Orbital overlay: driver params + kepler-group transform for inclination. */
export interface OrbitEnrichment {
	/** Kepler driver eccentricity. */
	eccentricity?: number;
	/** Ellipse orientation in the orbital plane (radians, kepler driver). */
	periapsisAngle?: number;
	/** Tilt of orbital plane from system ecliptic (degrees, kepler-group transform). */
	inclinationDeg?: number;
	/** Longitude of ascending node (degrees, rotation about +Y before inclination). */
	ascendingNodeDeg?: number;
}

export interface AppearanceEnrichment {
	preset?: PlanetPresetName;
	overrides?: Partial<PlanetParameters>;
}

export interface BodyGameplay {
	seasonality?: Seasonality;
	/** 0–1 harshness of winter shoulder seasons. */
	winterSeverity?: number;
	/** 0–1 summer agricultural bonus at perihelion. */
	summerCropBonus?: number;
	/** Multiplicative trade bonus near perihelion (e.g. 0.15 = +15%). */
	tradePerihelionBonus?: number;
	/** Multiplicative trade penalty near aphelion (e.g. 0.1 = −10%). */
	tradeAphelionPenalty?: number;
	/** Short player-facing copy for the galaxy detail panel. */
	flavor?: string;
}

export interface BodyEnrichment {
	orbit?: OrbitEnrichment;
	appearance?: AppearanceEnrichment;
	gameplay?: BodyGameplay;
}

/** Authored body not present in the extracted catalog (moon, gas giant, etc.). */
export interface AddedBody {
	id: string;
	name: string;
	kind: 'moon' | 'gas_giant';
	/** Planet id for moons; null for star-centered gas giants. */
	parentBodyId: string | null;
	render: {
		/** Orbit semi-major axis in metres (parent-relative for moons, heliocentric for giants). */
		orbitRadiusMeters: number;
		periodSeconds: number;
		phaseAtEpoch?: number;
		radiusMeters: number;
		eccentricity?: number;
		periapsisAngle?: number;
		inclinationDeg?: number;
		ascendingNodeDeg?: number;
		standIn?: boolean;
		spinPeriodSeconds?: number;
		appearance?: AppearanceEnrichment;
	};
	provenance: Provenance;
}

export interface SystemEnrichment {
	systemId: string;
	provenance: Provenance;
	bodies?: Record<string, BodyEnrichment>;
	additions?: AddedBody[];
}
