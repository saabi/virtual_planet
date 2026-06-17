# Planet document persistence

Named planet saves and the last-open session are stored in `localStorage`.

## Keys

| Key | Purpose |
|-----|---------|
| `virtual-planet:session:v1` | Auto-restored working state |
| `virtual-planet:documents:v1` | Named user documents |

## Load path

Never merge raw JSON into live state:

```
raw JSON → detectSchemaVersion → migrateSnapshot → coerceSnapshot → PlanetSnapshot
```

## Save path

```
toSnapshot(live state) → coerceSnapshot (defensive) → localStorage
```

## Modules

| File | Role |
|------|------|
| `types.ts` | `CURRENT_SNAPSHOT_VERSION`, `PlanetSnapshot`, registry/session envelopes |
| `snapshot.ts` | `toSnapshot`, `applySnapshot` |
| `schema.ts` | Whitelist coerce + defaults |
| `parse.ts` | `parseSnapshot` orchestrator |
| `migrate.ts` | Version migrations |
| `storage.ts` | Session + registry CRUD |
| `selection.ts` | `builtin:*` / `doc:*` select values |

## Adding a persisted field

1. Add to `PlanetParameters` in `params/planetParams.ts`
2. Add factory default in `params/presets.ts` for each preset
3. Add coerce line in `schema.ts`
4. Add explicit pick in `snapshot.ts` `toSnapshot` if not covered by spread
5. Run `npm test` — add a fixture if the change is breaking (bump `CURRENT_SNAPSHOT_VERSION` + migration)

Built-in presets in `presets.ts` are read-only templates. User edits live in documents and the session.
