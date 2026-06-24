import type { SystemEnrichment } from '../enrichmentTypes.js';

export const kalmandaaEnrichment: SystemEnrichment = {
	systemId: 'kalmandaa',
	provenance: { kind: 'authored', source: 'manual enrichment', notes: 'KalManDaa — Kala jungle' },
	bodies: {
		kala: {
			orbit: { eccentricity: 0.05, periapsisAngle: 1.4, inclinationDeg: 3, ascendingNodeDeg: 18 },
			appearance: {
				preset: 'archipelago',
				overrides: { vegetation_level: 0.5, water_level: 0.52 }
			},
			gameplay: {
				seasonality: 'medium',
				winterSeverity: 0.25,
				flavor: 'Weeks of rain feed hydro plants; ag struggles but tech fabs never thirst.'
			}
		}
	}
};
