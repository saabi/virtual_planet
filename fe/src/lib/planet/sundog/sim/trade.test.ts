import { describe, expect, it } from 'vitest';
import { getSystem } from '../catalog.js';
import { effectiveTrade } from './trade.js';
import { resolveSystem } from '../resolveSystem.js';

describe('effectiveTrade', () => {
	it('returns base trade when no enrichment gameplay', () => {
		const system = getSystem('jondd')!;
		const body = system.bodies[0]!;
		expect(effectiveTrade(body, system, 0)).toBeCloseTo(body.game.trade!, 0);
	});

	it('varies with season for glory iii', () => {
		const resolved = resolveSystem('glory')!;
		const body = resolved.extracted.bodies.find((b) => b.id === 'glory-iii')!;
		const gameplay = resolved.bodyEnrichments.get('glory-iii')?.gameplay;
		const orbit = resolved.bodyEnrichments.get('glory-iii')?.orbit;
		const at0 = effectiveTrade(body, resolved.extracted, 0, gameplay, orbit);
		const mid = effectiveTrade(body, resolved.extracted, 300, gameplay, orbit);
		expect(at0).not.toBeNull();
		expect(mid).not.toBeNull();
		// Eccentric orbit → trade should differ at different times.
		expect(at0).not.toBeCloseTo(mid!, 1);
	});
});
