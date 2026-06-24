import { describe, expect, it } from 'vitest';
import { enrichmentErrors, validateEnrichments } from './validateEnrichment.js';

describe('validateEnrichments', () => {
	it('has no errors for committed enrichments', () => {
		expect(enrichmentErrors()).toEqual([]);
	});

	it('reports unknown body ids', () => {
		const issues = validateEnrichments();
		expect(issues.filter((i) => i.level === 'error')).toHaveLength(0);
	});
});
