import type { SystemEnrichment } from '../enrichmentTypes.js';

export const hepaEnrichment: SystemEnrichment = {
	systemId: 'hepa',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Hepa — unremarkable green' },
	bodies: {
		hepa: {
			orbit: { eccentricity: 0.02, periapsisAngle: 1.1, inclinationDeg: 1.2, ascendingNodeDeg: 20 },
			appearance: { overrides: { vegetation_level: 0.32, water_level: 0.43 } },
			gameplay: {
				seasonality: 'low',
				flavor: 'Broad continent, easy ground routes; quiet reliable intra-regional trade.'
			}
		}
	}
};
