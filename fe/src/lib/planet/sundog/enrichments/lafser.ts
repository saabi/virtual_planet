import type { SystemEnrichment } from '../enrichmentTypes.js';

export const lafserEnrichment: SystemEnrichment = {
	systemId: 'lafser',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Lafser — Tcana desert' },
	bodies: {
		tcana: {
			orbit: { eccentricity: 0.1, periapsisAngle: 2.1, inclinationDeg: 2.5, ascendingNodeDeg: 30 },
			appearance: {
				preset: 'desert',
				overrides: { vegetation_level: 0.05, sand_cutoff: 0.08, water_level: 0.32 }
			},
			gameplay: {
				seasonality: 'high',
				winterSeverity: 0.6,
				flavor: 'Water is currency; mineral haulers time runs to avoid scorching perihelion weeks.'
			}
		}
	}
};
