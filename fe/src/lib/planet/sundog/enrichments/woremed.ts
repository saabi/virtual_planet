import type { SystemEnrichment } from '../enrichmentTypes.js';

export const woremedEnrichment: SystemEnrichment = {
	systemId: 'woremed',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Woremed — pirate jungle' },
	bodies: {
		worrad: {
			orbit: { eccentricity: 0.08, periapsisAngle: 1.2, inclinationDeg: 5, ascendingNodeDeg: 22 },
			appearance: {
				preset: 'archipelago',
				overrides: { vegetation_level: 0.55, water_level: 0.52 }
			},
			gameplay: {
				seasonality: 'medium',
				winterSeverity: 0.35,
				flavor: 'Swamp squid and pirates; route risk spikes when system pirate activity is high.'
			}
		}
	}
};
