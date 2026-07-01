import type { SystemEnrichment } from '../enrichmentTypes.js';

const AUTHORED = {
	kind: 'authored' as const,
	source: 'manual enrichment',
	notes: 'Jondd system — Drahew Alliance hub'
};

export const jonddEnrichment: SystemEnrichment = {
	systemId: 'jondd',
	provenance: AUTHORED,
	bodies: {
		jondd: {
			orbit: { eccentricity: 0.03, periapsisAngle: 0.8, inclinationDeg: 2, ascendingNodeDeg: 15 },
			appearance: { overrides: { vegetation_level: 0.35, snow_cover: 0.25 } },
			gameplay: {
				seasonality: 'low',
				flavor: 'Stable political center; year-round trade through Drahew starport.'
			}
		},
		heavy: {
			orbit: { eccentricity: 0.06, periapsisAngle: 3.6, inclinationDeg: 4, ascendingNodeDeg: 40 },
			appearance: { overrides: { vegetation_level: 0.4, voronoi_amplitude: 0.12 } },
			gameplay: {
				seasonality: 'medium',
				summerCropBonus: 0.25,
				tradePerihelionBonus: 0.12,
				flavor: 'Agricultural breadbasket; export convoys peak near perihelion summers.'
			}
		}
	}
};
