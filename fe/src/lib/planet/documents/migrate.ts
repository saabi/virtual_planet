/**
 * Snapshot schema migrations.
 *
 * v1 — initial planet snapshot (params + preset + orbit camera).
 * v2 — added `atmosphere` block. Older snapshots omit it; `coerceAtmosphere`
 *      fills radius-derived defaults, so no structural rewrite is needed here.
 */

export function migrateSnapshot(raw: unknown, _fromVersion: number): unknown {
	return raw;
}
