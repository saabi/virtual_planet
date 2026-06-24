import type { SunDogSystem } from './catalogTypes.js';
import { getSystem, listSystems } from './catalog.js';
import type { SystemEnrichment } from './enrichmentTypes.js';
import { ENRICHMENTS } from './enrichments/index.js';

export interface EnrichmentIssue {
	level: 'error' | 'warning';
	message: string;
}

const MAX_ECCENTRICITY = 0.5;
const PERIAPSIS_MIN_SEPARATION = 0.4;

function periapsisAngles(system: SunDogSystem, enrichment?: SystemEnrichment): number[] {
	const angles: number[] = [];
	for (const body of system.bodies) {
		const e = enrichment?.bodies?.[body.id]?.orbit?.periapsisAngle;
		angles.push(e ?? 0);
	}
	return angles;
}

function checkPeriapsisSpread(system: SunDogSystem, enrichment: SystemEnrichment | undefined, issues: EnrichmentIssue[]) {
	if (system.bodies.length < 2) return;
	const angles = periapsisAngles(system, enrichment);
	for (let i = 0; i < angles.length; i++) {
		for (let j = i + 1; j < angles.length; j++) {
			const da = Math.abs(angles[i]! - angles[j]!);
			const sep = Math.min(da, Math.PI * 2 - da);
			if (sep < PERIAPSIS_MIN_SEPARATION) {
				issues.push({
					level: 'warning',
					message: `System ${system.id}: bodies ${system.bodies[i]!.id} and ${system.bodies[j]!.id} periapsisAngle too close (${sep.toFixed(2)} rad < ${PERIAPSIS_MIN_SEPARATION})`
				});
			}
		}
	}
}

function validateOne(enrichment: SystemEnrichment, issues: EnrichmentIssue[]) {
	const system = getSystem(enrichment.systemId);
	if (!system) {
		issues.push({ level: 'error', message: `Enrichment references unknown system "${enrichment.systemId}"` });
		return;
	}

	const bodyIds = new Set(system.bodies.map((b) => b.id));
	for (const id of Object.keys(enrichment.bodies ?? {})) {
		if (!bodyIds.has(id)) {
			issues.push({
				level: 'error',
				message: `Enrichment ${enrichment.systemId}: unknown body id "${id}"`
			});
		}
	}

	for (const [id, body] of Object.entries(enrichment.bodies ?? {})) {
		const e = body.orbit?.eccentricity;
		if (e !== undefined && (e < 0 || e > MAX_ECCENTRICITY)) {
			issues.push({
				level: 'error',
				message: `Enrichment ${enrichment.systemId}/${id}: eccentricity ${e} out of [0, ${MAX_ECCENTRICITY}]`
			});
		}
	}

	const additionIds = new Set<string>();
	for (const add of enrichment.additions ?? []) {
		if (bodyIds.has(add.id) || additionIds.has(add.id)) {
			issues.push({
				level: 'error',
				message: `Enrichment ${enrichment.systemId}: duplicate addition id "${add.id}"`
			});
		}
		additionIds.add(add.id);
		if (add.parentBodyId !== null && !bodyIds.has(add.parentBodyId)) {
			issues.push({
				level: 'error',
				message: `Enrichment ${enrichment.systemId}: addition "${add.id}" parent "${add.parentBodyId}" unknown`
			});
		}
	}

	checkPeriapsisSpread(system, enrichment, issues);
}

export function validateEnrichments(): EnrichmentIssue[] {
	const issues: EnrichmentIssue[] = [];
	for (const enrichment of Object.values(ENRICHMENTS)) {
		validateOne(enrichment, issues);
	}
	// Every catalog system should have enrichment in this wave.
	for (const system of listSystems()) {
		if (!ENRICHMENTS[system.id]) {
			issues.push({ level: 'warning', message: `System "${system.id}" has no enrichment module` });
		}
	}
	return issues;
}

export function enrichmentErrors(): EnrichmentIssue[] {
	return validateEnrichments().filter((i) => i.level === 'error');
}
