import type { SystemEnrichment } from '../enrichmentTypes.js';

const EARTH_RADIUS_M = 6.371e6;
const SEC_PER_DAY = 1;

export const enlieEnrichment: SystemEnrichment = {
	systemId: 'enlie',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Enlie — pirate regolith' },
	bodies: {
		enliah: {
			orbit: { eccentricity: 0.22, periapsisAngle: 3.1, inclinationDeg: 8, ascendingNodeDeg: 60 },
			appearance: {
				preset: 'craters',
				overrides: { vegetation_level: 0, water_level: 0.2, snow_cover: 0.1 }
			},
			gameplay: {
				seasonality: 'high',
				winterSeverity: 0.5,
				tradeAphelionPenalty: 0.25,
				flavor: 'Airless rebel rock; telemetry dies in-system — traders avoid aphelion runs.'
			}
		}
	},
	additions: [
		{
			id: 'enliah-debris',
			name: 'Enliah Debris',
			kind: 'moon',
			parentBodyId: 'enliah',
			render: {
				orbitRadiusMeters: 1.8e7,
				periodSeconds: 9 * SEC_PER_DAY,
				phaseAtEpoch: 0.7,
				radiusMeters: 0.03 * EARTH_RADIUS_M,
				eccentricity: 0.15,
				periapsisAngle: 2.2,
				inclinationDeg: 12,
				spinPeriodSeconds: 36
			},
			provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Suspected pirate staging debris moon' }
		}
	]
};
