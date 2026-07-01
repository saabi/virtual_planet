import { describe, expect, it } from 'vitest';
import { getSystem } from './catalog.js';
import { resolveSystem, listResolvedSystems } from './resolveSystem.js';

describe('resolveSystem', () => {
	it('merges enrichment for jondd', () => {
		const r = resolveSystem('jondd');
		expect(r).toBeTruthy();
		expect(r!.bodyEnrichments.get('jondd')?.orbit?.eccentricity).toBe(0.03);
		expect(r!.extracted.id).toBe('jondd');
	});

	it('lists all 12 systems with enrichment', () => {
		const resolved = listResolvedSystems();
		expect(resolved).toHaveLength(12);
		for (const r of resolved) {
			expect(r.enrichment).toBeTruthy();
		}
	});

	it('returns undefined for unknown id', () => {
		expect(resolveSystem('nope')).toBeUndefined();
	});

	it('glory has additions', () => {
		const r = resolveSystem('glory');
		expect(r?.enrichment?.additions?.length).toBe(1);
	});
});
