import type { SystemEnrichment } from '../enrichmentTypes.js';

export const sosaiEnrichment: SystemEnrichment = {
	systemId: 'sosai',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'Sosai — Vahevela tech' },
	bodies: {
		vahevela: {
			orbit: { eccentricity: 0.07, periapsisAngle: 2.8, inclinationDeg: 2.5, ascendingNodeDeg: 42 },
			appearance: { overrides: { vegetation_level: 0.22, water_level: 0.42, snow_cover: 0.2 } },
			gameplay: {
				seasonality: 'medium',
				tradePerihelionBonus: 0.08,
				flavor: 'Aerospace crown jewel; black-market decks hum loudest near perihelion.'
			}
		}
	}
};
