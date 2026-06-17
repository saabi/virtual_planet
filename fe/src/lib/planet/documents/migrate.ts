/**
 * Snapshot schema migrations.
 *
 * v1 — initial planet snapshot (params + preset + orbit camera).
 * v2 — added `atmosphere` block. Older snapshots omit it; `coerceAtmosphere`
 *      fills radius-derived defaults, so no structural rewrite is needed here.
 * v3 — relief amplitudes (voronoi/detail/texture/polar) became ratios of radius
 *      instead of absolute metres. Convert `amplitude → amplitude / radius` so a
 *      saved planet keeps the same shape (the shader now multiplies by radius).
 */

const RELIEF_RATIO_FIELDS = [
	'voronoi_amplitude',
	'detail_amplitude',
	'texture_noise_amplitude',
	'polar_amplitude'
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function migrateSnapshot(raw: unknown, fromVersion: number): unknown {
	if (fromVersion < 3 && isRecord(raw) && isRecord(raw.params)) {
		const p = raw.params;
		const radius = typeof p.radius === 'number' && p.radius > 0 ? p.radius : 100;
		for (const field of RELIEF_RATIO_FIELDS) {
			if (typeof p[field] === 'number') {
				p[field] = (p[field] as number) / radius;
			}
		}
	}
	return raw;
}
