import type { SystemEnrichment } from '../enrichmentTypes.js';

export const jadulEnrichment: SystemEnrichment = {
	systemId: 'jadul',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Jadul — Krakorum tech capital' },
	bodies: {
		krakorum: {
			orbit: { eccentricity: 0.03, periapsisAngle: 0.9, inclinationDeg: 1.8, ascendingNodeDeg: 28 },
			appearance: { overrides: { voronoi_amplitude: 0.13, vegetation_level: 0.18 } },
			gameplay: {
				seasonality: 'low',
				flavor: 'Sprawling tech campuses; little ag but steady component export traffic.'
			}
		}
	}
};
