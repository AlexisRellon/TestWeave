# Releasing TestWeave

Releases use [Semantic Versioning 2.0.0](https://semver.org/) and tags of the form `vMAJOR.MINOR.PATCH`, optionally followed by a prerelease suffix such as `v0.2.0-rc.1`. Build metadata (`+...`) is intentionally not supported by the release workflow.

Use patch versions for compatible fixes, minor versions for compatible features, and major versions for incompatible stable API changes. While the package remains at `0.x`, incompatible changes may use a minor bump, but must be called out under **Breaking changes**. The public surface includes CLI flags and exit codes, contract schema, exported TypeScript APIs, and MCP tools/resources.

## Stable compatibility and upgrades

Version 1.0.0 consolidates the unpublished v0.9 viewer and review work with audited fixes into the first stable release. Published history through v0.8.0 stays intact. The package version and contract version are independent: v1.0.0 uses contract `schemaVersion: 2`.

Compatible fixes and additions preserve documented CLI flags and exit codes, public exports from `testweave`, and MCP tool/resource contracts. Breaking changes to those surfaces require a major release and migration guidance. Internal source paths are not package entrypoints.

Schema v1 remains readable without automatic migration on reads or diagnosis. Run `testweave doctor --fix` explicitly to upgrade existing files. Migration preserves module/test IDs, definitions and surrounding Markdown, validates each write, and is idempotent. Atomicity applies to each owning contract file, not the entire include graph: earlier files can remain upgraded if a later file fails. Resolve the diagnostic and rerun the command. Invalid definitions and held locks must not be bypassed.

After installing the intended release, run `testweave update --yes` and `testweave doctor` in each workspace to refresh managed skills, MCP launch paths and hooks. Confirm the pre-push hook selects that installation; an older global executable may reject schema v2 despite passing checks with a newer workspace build. Package installation is separate from `update`.

The viewer's browser-local notes are keyed by test ID within an origin/port, are not workspace-scoped, and never enter contracts or exports. Storage failures fall back to page memory. Import compatibility covers the [documented layouts](skills/testweave/commands/import.md), not all vendor editions or custom exports.

Versions increase across all release tags, including prereleases. After publishing a prerelease, finish that release line or publish a higher version; this project does not currently maintain parallel release branches.

## Prepare a release PR

1. Create a branch from current `main`.
2. Update the version with `npm version 1.0.0 --no-git-tag-version` (substitute the intended version). This updates both package and lockfile metadata.
3. Move the relevant `Unreleased` notes into `## [1.0.0] - YYYY-MM-DD`, using the intended release date. Keep `## [Unreleased]` for later work.
4. Group notes under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`, or `### Breaking changes`. Include migration steps for incompatible changes.
5. Run `npm run check`, `node scripts/release.mjs v1.0.0`, `npm pack --dry-run`, and `npm run bundle:source`. Exercise `npm run check:manager -- <manager>` for `npm`, `pnpm`, `yarn-classic`, `yarn-pnp` and `bun`; retain actual results separately from the required cross-platform CI results.
6. Open a PR titled `chore(release): prepare v1.0.0`. Merge it only after the required CI checks pass.

No release tag has to be created while preparing the PR. Local validation does not establish that remote CI passed or that a package was published.

## Tag the merged commit

Fetch the merged release, then create and push an annotated tag:

```sh
git switch main
git pull --ff-only
git tag -a v1.0.0 -m "TestWeave v1.0.0"
git push origin v1.0.0
```

The tag must point to a commit on `main`. The workflow validates canonical SemVer, exact package/lockfile/tag agreement, increasing versions, and a unique dated changelog entry. It then runs the full reusable CI matrix before building an npm-compatible tarball.

The workflow creates a GitHub Release named **TestWeave v1.0.0**, with that version's changelog section, installation instructions, `testweave-1.0.0.tgz`, and `SHA256SUMS`. Prerelease tags create GitHub prereleases and do not become the latest stable release. The workflow does not publish packages to npm registries.

If you choose to publish to npmjs manually, use the exact tested release tarball:

```sh
gh release download v1.0.0 --pattern testweave-1.0.0.tgz --pattern SHA256SUMS --dir release-assets
cd release-assets
sha256sum --check SHA256SUMS
npm login --registry=https://registry.npmjs.org
npm publish ./testweave-1.0.0.tgz --access public --registry=https://registry.npmjs.org
npm view testweave@1.0.0 version dist.integrity
```

On PowerShell, use `Get-FileHash -Algorithm SHA256` and compare the hash with `SHA256SUMS`. For prereleases, add `--tag next` to `npm publish`. Complete any npm account or two-factor authentication challenge locally; never put credentials in repository files or PRs. Confirm that the registry's tarball integrity matches the released artifact. This publishes already-built files and does not rebuild a different package.

## Failure and recovery

If validation or tests fail, no GitHub Release is created. Fix the cause through a PR. Published versions and tags are immutable by project policy: never move or reuse a published tag; release a new version for corrections. A rerun can complete a failed workflow if the tag is unchanged and no GitHub Release exists yet. An existing release causes publication to fail rather than overwrite its assets.

## Repository settings

The live `main` protection is recorded in [.github/main-protection.json](.github/main-protection.json). It requires `CI required` from GitHub Actions, an up-to-date branch, a pull request, and resolved conversations, including for admins. To restore this configuration, a repository administrator can run:

```sh
gh api --method PUT repos/AlexisRellon/TestWeave/branches/main/protection --input .github/main-protection.json
```

GitHub Actions use commit-pinned references maintained by Dependabot. The CI token has read-only access; only the final release job can write release assets. Do not change PR workflows to `pull_request_target` while checking out untrusted contribution code.

The release pipeline follows the validation-before-publication approach of the [lean-ctx release workflow](https://github.com/yvgude/lean-ctx/blob/main/.github/workflows/release.yml), adapted to a Node.js package.
