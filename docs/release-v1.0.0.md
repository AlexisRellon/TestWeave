# v1.0.0 release candidate verification

This candidate consolidates the unpublished v0.9 viewer/review work, branding and audit repairs. On 2026-10-29, `gh release list` and `git ls-remote --tags origin` both confirmed published history stops at v0.8.0. No tag or publication is part of this preparation.

## Local evidence

- Clean `npm ci --engine-strict` followed by `npm run check`: 218 tests passed, with typecheck and build (Windows, Node 24.22.1), after the final CSP and dependency repairs.
- `node scripts/release.mjs v1.0.0`: accepted package/lockfile/tag/changelog agreement.
- `npm pack --dry-run`: required compiled CLI/MCP/viewer, canonical skill documents and local brand assets included.
- `npm run bundle:source`: regenerated implementation documentation after integration.
- `testweave sync --strict --base HEAD`: no blocking drift; QA definitions preserve stable IDs and cover migration and viewer boundaries.
- All five installed-tarball checks passed on Windows: npm 11.12.1, pnpm 10.34.6, Yarn Classic 1.22.22, Yarn PnP 4.18.1 and Bun 1.4.2. Checks cover CLI version, complete skills and repair, doctor, viewer assets, all ten MCP tools and Git pre-push blocking/recovery.
- Packaged Chromium viewer: all five views at 1440×1000 and 393×852; keyboard navigation, note persistence/confirmed clear, export isolation, HTTP write rejection, no external requests or JavaScript errors. All 49 graph cards were nonoverlapping. Browser evidence is retained locally under `.impeccable/release-viewer/`.
- Compatibility coverage includes byte-preserving v1 reads/diagnosis, explicit idempotent migration, included contracts, IDs/prose/local paths, held locks, malformed documents and atomic replacement failure/retry.
- Existing import, semantic-signature, revision-context, bounded-glob and annotation-storage regressions remain covered. Workers cross-reviewed compatibility and packaging changes without blocking findings.

The final CSP and dependency repairs passed all five manager checks and the packaged browser check with `NODE_ENV` unset. The tested `testweave-1.0.0.tgz` SHA256 is `1006f0c8ad2fccb8c8b801ae2d5a9df14b43a3db46c9682c63ad43b44b39cafa`. `npm audit --omit=dev` reports zero findings.

## Remote evidence

[Release PR #31](https://github.com/AlexisRellon/TestWeave/pull/31), implementation commit `b3a9e5810f548407bd984cb9ec0fde33cbb480f6`, passed [CI run 40888696320](https://github.com/AlexisRellon/TestWeave/actions/runs/40888696320): all nine test lanes (Ubuntu 24.04, Ubuntu 26.04 and Windows, each with Node 20/22/24), all fifteen installation lanes (the same OS runners with five managers), repository checks and `CI required`. Socket project/report alerts and Snyk also passed. Later documentation-only commits retain their own PR checks.

## Release gates and limits

The required remote matrix passed for the implementation commit as recorded above. CodeRabbit CLI was unavailable; reviews here were source and cross-worker reviews. Tagging, merging and publication require a separate instruction.

Schema v2 is current and v1 remains readable. Migration is explicit and atomic per owning file, with no include-tree rollback guarantee. Browser notes are origin/port and test-ID scoped, not workspace scoped; unavailable storage falls back to page memory. Browser checks cover Chromium at two widths; storage failures are exercised by the VM regression. Importers accept documented local definition layouts; external vendor services were not tested.
