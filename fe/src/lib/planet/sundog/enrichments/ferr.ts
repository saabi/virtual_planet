import type { SystemEnrichment } from '../enrichmentTypes.js';

const AU = 1.495978707e11;
const EARTH_RADIUS_M = 6.371e6;
const SEC_PER_DAY = 1;

export const ferrEnrichment: SystemEnrichment = {
	systemId: 'ferr',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Ferr system — aerospace + Snowball' },
	bodies: {
		ferr: {
			orbit: { eccentricity: 0.04, periapsisAngle: 0.5, inclinationDeg: 2, ascendingNodeDeg: 10 },
			appearance: { overrides: { voronoi_amplitude: 0.11, vegetation_level: 0.28 } },
			gameplay: {
				seasonality: 'low',
				flavor: 'Mountain aerospace yards; black-market tech flows through coastal starports.'
			}
		},
		ferrwerk: {
			orbit: { eccentricity: 0.06, periapsisAngle: 2.3, inclinationDeg: 4, ascendingNodeDeg: 45 },
			appearance: {
				overrides: { voronoi_amplitude: 0.14, water_level: 0.46, detail_amplitude: 0.08 }
			},
			gameplay: {
				seasonality: 'medium',
				flavor: 'Impact-basin continent; science industry peaks after mild perihelion summers.'
			}
		},
		snowball: {
			orbit: { eccentricity: 0.12, periapsisAngle: 4.2, inclinationDeg: 6, ascendingNodeDeg: 80 },
			appearance: {
				preset: 'frozen',
				overrides: { snow_cover: 0.92, vegetation_level: 0, water_level: 0.35 }
			},
			gameplay: {
				seasonality: 'high',
				winterSeverity: 0.95,
				tradeAphelionPenalty: 0.2,
				flavor: 'Arctic plate cities; mineral and fish exports freeze up every aphelion.'
			}
		}
	},
	additions: [
		{
			id: 'ferr-outer-giant',
			name: 'Ferr Belt',
			kind: 'gas_giant',
			parentBodyId: null,
			render: {
				orbitRadiusMeters: 7.2 * AU,
				periodSeconds: 4200 * SEC_PER_DAY,
				phaseAtEpoch: 1.2,
				radiusMeters: 3.5 * EARTH_RADIUS_M,
				eccentricity: 0.08,
				periapsisAngle: 3.5,
				inclinationDeg: 7,
				ascendingNodeDeg: 25,
				standIn: true,
				spinPeriodSeconds: 18
			},
			provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Sparse outer jovian — navigation landmark' }
		}
	]
};
