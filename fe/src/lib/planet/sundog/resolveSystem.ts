import { getSystem, listSystems } from './catalog.js';
import type { SunDogSystem } from './catalogTypes.js';
import type { BodyEnrichment, SystemEnrichment } from './enrichmentTypes.js';
import { ENRICHMENTS } from './enrichments/index.js';

export interface ResolvedSunDogSystem {
	extracted: SunDogSystem;
	enrichment?: SystemEnrichment;
	bodyEnrichments: Map<string, BodyEnrichment>;
}

function buildResolved(extracted: SunDogSystem): ResolvedSunDogSystem {
	const enrichment = ENRICHMENTS[extracted.id];
	const bodyEnrichments = new Map<string, BodyEnrichment>();
	if (enrichment?.bodies) {
		for (const [id, body] of Object.entries(enrichment.bodies)) {
			bodyEnrichments.set(id, body);
		}
	}
	return { extracted, enrichment, bodyEnrichments };
}

/** Shallow merge: extracted catalog system + optional authored enrichment. */
export function resolveSystem(id: string): ResolvedSunDogSystem | undefined {
	const extracted = getSystem(id);
	if (!extracted) return undefined;
	return buildResolved(extracted);
}

export function listResolvedSystems(): ResolvedSunDogSystem[] {
	return listSystems().map(buildResolved);
}

export function getBodyEnrichment(resolved: ResolvedSunDogSystem, bodyId: string): BodyEnrichment | undefined {
	return resolved.bodyEnrichments.get(bodyId);
}
