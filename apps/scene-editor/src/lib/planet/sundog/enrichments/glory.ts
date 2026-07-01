import type { SystemEnrichment } from '../enrichmentTypes.js';

const EARTH_RADIUS_M = 6.371e6;
const SEC_PER_DAY = 1;

export const gloryEnrichment: SystemEnrichment = {
	systemId: 'glory',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Glory — three habitable jewels' },
	bodies: {
		'glory-i': {
			orbit: { eccentricity: 0.02, periapsisAngle: 0.4, inclinationDeg: 1.5, ascendingNodeDeg: 5 },
			appearance: { overrides: { snow_cover: 0.15, vegetation_level: 0.3, water_level: 0.45 } },
			gameplay: {
				seasonality: 'low',
				flavor: 'Luxury resort world; stable year-round tourism and lake-country trade.'
			}
		},
		'glory-ii': {
			orbit: { eccentricity: 0.02, periapsisAngle: 2.5, inclinationDeg: 3, ascendingNodeDeg: 35 },
			appearance: { overrides: { vegetation_level: 0.35, water_level: 0.44 } },
			gameplay: {
				seasonality: 'low',
				summerCropBonus: 0.15,
				flavor: 'Twin continents across a narrow sea; steady ag and tech exports.'
			}
		},
		'glory-iii': {
			orbit: { eccentricity: 0.14, periapsisAngle: 4.8, inclinationDeg: 5.5, ascendingNodeDeg: 70 },
			appearance: { overrides: { snow_cover: 0.45, voronoi_amplitude: 0.1, vegetation_level: 0.2 } },
			gameplay: {
				seasonality: 'high',
				winterSeverity: 0.7,
				tradeAphelionPenalty: 0.12,
				flavor: 'Rugged and sparse; Surrell starport quiets on long aphelion winters.'
			}
		}
	},
	additions: [
		{
			id: 'glory-iii-moon',
			name: 'Glory III Minor',
			kind: 'moon',
			parentBodyId: 'glory-iii',
			render: {
				orbitRadiusMeters: 2.5e7,
				periodSeconds: 18 * SEC_PER_DAY,
				phaseAtEpoch: 0.3,
				radiusMeters: 0.04 * EARTH_RADIUS_M,
				eccentricity: 0.05,
				periapsisAngle: 1.1,
				inclinationDeg: 8,
				spinPeriodSeconds: 48
			},
			provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Sparse rugged moon' }
		}
	]
};
