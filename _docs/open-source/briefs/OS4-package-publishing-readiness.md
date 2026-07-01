# Brief OS4 - Package scope and npm publishing readiness

**Type:** release engineering. **Scope:** npm identity, package builds, export maps,
tarball contents, package documentation. **Depends on:** owner confirmation of npm scope.
**Status:** draft; publishing remains disabled.

## Objective

Prepare the reusable `packages/*` libraries for external npm consumers without publishing
them yet. The current Changesets setup manages versions, but packages still export source
TypeScript and lack a deliberate tarball/build contract.

## Scope decision

The existing `@virtual-planet/*` scope is narrower than World Lab's intended use. Preferred
direction: `@world-lab/*`, provided the corresponding npm organization/scope is controlled
by the repository owner. A durable owner scope such as `@saabi/*` is the fallback.

Do not rename packages until scope ownership is confirmed. Package renaming touches every
workspace dependency, import, test expectation, Vite external rule, Changesets config, and
lockfile entry.

## Required work

- Choose and reserve the npm scope.
- Rename publishable packages and all internal references atomically.
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

