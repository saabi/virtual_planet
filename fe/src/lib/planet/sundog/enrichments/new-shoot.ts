import type { SystemEnrichment } from '../enrichmentTypes.js';

export const newShootEnrichment: SystemEnrichment = {
	systemId: 'new-shoot',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'New Shoot — Hell + homeworld' },
	bodies: {
		hell: {
			orbit: { eccentricity: 0.05, periapsisAngle: 0.6, inclinationDeg: 3, ascendingNodeDeg: 8 },
			appearance: {
				preset: 'desert',
				overrides: { water_level: 0.28, sand_cutoff: 0.12, vegetation_level: 0, snow_cover: 0.05 }
			},
			gameplay: {
				seasonality: 'high',
				winterSeverity: 0.85,
				tradeAphelionPenalty: 0.15,
				flavor: 'Blistering dome cities; dust storms choke aphelion trade lanes.'
			}
		},
		'new-shoot': {
			orbit: { eccentricity: 0.07, periapsisAngle: 3.9, inclinationDeg: 4.5, ascendingNodeDeg: 55 },
			appearance: {
				preset: 'archipelago',
				overrides: { vegetation_level: 0.5, water_level: 0.48, erosion: 1.3 }
			},
			gameplay: {
				seasonality: 'medium',
				flavor: 'Tech workshops behind rainforest walls; ash-soil ag booms after monsoon seasons.'
			}
		}
	}
};
