# Brief OS4 - Package scope and npm publishing readiness

**Type:** release engineering. **Scope:** npm identity, package builds, export maps,
tarball contents, package documentation. **Depends on:** owner confirmation of npm scope.
**Status:** 🔄 Scope decision + rename **done**; the rest of "Required work" below is
**still open**.

## Objective

Prepare the reusable `packages/*` libraries for external npm consumers without publishing
them yet. The current Changesets setup manages versions, but packages still export source
TypeScript and lack a deliberate tarball/build contract.

## Scope decision — ✅ decided: `@world-lab/*`

The original `@virtual-planet/*` scope was narrower than World Lab's intended use (a
multi-app platform, not a single "virtual planet" tool). Owner confirmed `@world-lab` is
available on npm and chose it over the `@saabi/*` personal-scope fallback this brief
originally proposed.

**Rename executed atomically**: all 10 `packages/*` libraries moved from `@virtual-planet/*`
to `@world-lab/*`. Beyond this brief's literal ask, for naming consistency across the
monorepo, both apps' package names were renamed too (`@world-lab/scene-editor-app`,
`@world-lab/webgputoy-app`) — they stay private and never publish, so the scope choice
doesn't affect them functionally; this was purely to avoid a half-renamed-looking monorepo.
Every internal reference updated together: package.json dependencies, source imports, both
apps' Vite SSR `noExternal` regexes, the `graph-editor` ADR import-guard whitelist regex,
`.changeset/config.json`'s `ignore` list, the queued `.changeset/*.md` changeset,
`packages/subdivide`'s own `LICENSE` header, and live docs (root README, CLAUDE.md, app
READMEs). Completed procedural-graph milestone briefs
(`_docs/architecture/procedural-graph/briefs/**`, `STATUS.md`, `handoffs/**`) intentionally
still show `@virtual-planet/*` — they're historical records of what was true when that work
landed, not live references (the same treatment OS1 gave old `fe/` path mentions there).

## Required work

- ~~Choose and reserve the npm scope.~~ ✅ done (`@world-lab`).
- ~~Rename publishable packages and all internal references atomically.~~ ✅ done.
- Define which packages are independently useful and public.
- Add a build pipeline that emits JavaScript and declarations into `dist/`.
- Point `exports` at built artifacts with explicit `types` and `import` conditions.
- Add `files` allowlists and accurate `sideEffects` metadata.
- Add a README to every publishable package.
- Replace broad internal dependency ranges such as `"*"` with an intentional release
  policy.
- Keep apps private and ignored by Changesets.
- Add `npm pack --dry-run` checks for every publishable package.
- Add a clean consumer smoke test that installs packed tarballs outside the monorepo.
- Remove `private: true` only in the explicit publish-enablement change.

## Gate

- Every package builds from a clean checkout.
- `npm pack --dry-run` contains only intended runtime files, README, package metadata, and
  license.
- A temporary external project can install and import each tarball without TypeScript source
  compilation assumptions.
- Changesets versions internal dependencies consistently.
- No npm publish command runs until the owner explicitly enables publishing.

