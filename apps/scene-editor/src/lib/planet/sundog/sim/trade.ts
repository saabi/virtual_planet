import type { BodyGameplay, OrbitEnrichment } from '../enrichmentTypes.js';
import type { SunDogBody, SunDogSystem } from '../catalogTypes.js';
import { insolationFactor } from './insolation.js';

const SEASONALITY_SCALE: Record<NonNullable<BodyGameplay['seasonality']>, number> = {
	low: 0.05,
	medium: 0.12,
	high: 0.22
};

/** Effective trade score at scene time t (toy prototype, not full economy). */
export function effectiveTrade(
	body: SunDogBody,
	system: SunDogSystem,
	t: number,
	gameplay?: BodyGameplay,
	orbit?: OrbitEnrichment
): number | null {
	const base = body.game.trade;
	if (base === null) return null;

	let factor = 1;
	const f = insolationFactor(body, t, orbit);
	const seasonality = gameplay?.seasonality ?? 'low';
	const swing = SEASONALITY_SCALE[seasonality];

	if (f > 1) {
		factor += swing * (f - 1) + (gameplay?.tradePerihelionBonus ?? 0);
		factor += (gameplay?.summerCropBonus ?? 0) * Math.min(1, f - 1);
	} else {
		factor -= swing * (1 - f) + (gameplay?.tradeAphelionPenalty ?? 0);
		factor -= (gameplay?.winterSeverity ?? 0) * (1 - f) * 0.15;
	}

	const priceMod = system.game.priceModifier;
	if (priceMod !== null && priceMod > 0) {
		factor *= 1 + (priceMod - 1) * 0.05;
	}

	return Math.max(0, base * factor);
}

/** Format effective trade for display. */
export function formatEffectiveTrade(value: number | null): string {
	if (value === null) return '—';
	return value.toFixed(1);
}
