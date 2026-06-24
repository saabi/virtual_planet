import type { SystemEnrichment } from '../enrichmentTypes.js';

export const shootEnrichment: SystemEnrichment = {
	systemId: 'shoot',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Shoot — monsoon jungle' },
	bodies: {
		shoot: {
			orbit: { eccentricity: 0.04, periapsisAngle: 1.7, inclinationDeg: 3.5, ascendingNodeDeg: 12 },
			appearance: {
				preset: 'archipelago',
				overrides: { vegetation_level: 0.45, water_level: 0.5 }
			},
			gameplay: {
				seasonality: 'medium',
				summerCropBonus: 0.2,
				flavor: 'Monsoon belts swing ag output; balanced tech and farmland exports.'
			}
		}
	}
};
