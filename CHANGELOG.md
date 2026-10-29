# Changelog

User-visible changes are recorded here. Releases follow [Semantic Versioning](https://semver.org/); the release format and process are documented in [RELEASING.md](RELEASING.md).

## [Unreleased]

## [1.0.0] - 2026-10-29

### Added

- Semantic contract diffing with text, Markdown, JSON and GitHub output, including package contracts, scenario steps and outcomes, NFT profiles and linked paths/specs.
- GitHub workflow annotations and step summaries combining QA drift with definition changes while preserving sync policy and exit codes.
- A zero-cloud `testweave ui` / `view` loopback viewer with five views: scenario catalog, test-document table, live drift and impact dashboard, interactive coverage graph, and visual semantic diff with filtered exporter downloads.
- Browser-local assessment and comment notes with filtering and confirmed clearing; these never enter contracts or exports.
- Woven W branding, light/dark logo assets, favicons, and a responsive local viewer shell.
- Local live reload, HTTP boundary checks, regression coverage and manual QA definitions for the new review workflows.

### Changed

- Consolidated the unreleased v0.9 work into the first stable release. Schema v2 remains current; v1 reads remain supported and `doctor --fix` explicitly migrates existing definitions while preserving IDs and prose.
- Documented stable CLI, TypeScript and MCP compatibility, scoped skill workflows, and supported importer layouts. Contract replacement is atomic per owning file; migration across includes is not a graph-wide transaction.

### Fixed

- Semantic drift retains inferred function-name changes through parentheses and TypeScript syntax wrappers.
- Public generic constraints and defaults retain referenced type dependencies during semantic comparison.
- Optional public class fields remain distinct from required fields during semantic comparison.
- Planned recursive-glob impact comparisons cache repeated states instead of stalling on incompatible trailing paths.
- Explicit target-revision spec reads use committed section text even when the working document is dirty or missing.
- Xray imports accept the UAT label emitted by TestWeave exports.
- Jira CSV imports split space-separated labels into independently filterable tags without inferring a test type.
- Repository QA fixture examples no longer activate an undefined fixture during unfiltered exports.
- Viewer graph cards avoid overlap, unknown drift metadata is omitted, diagnostic labels wrap, canonical default-port origins are accepted, and local notes remain usable when browser storage fails or cases are removed.
- Installed viewer CSP excludes development service endpoints even when `NODE_ENV` is unset.

### Known limitations

- Browser notes are keyed by test ID within a browser origin, including its port, rather than by workspace. They are personal scratch notes, not shared execution history; unavailable storage falls back to page memory.
- Importers accept the layouts documented in the import guide, not every vendor edition or customized export. No external test-management service is contacted.

### Security

- Upgrade Zod to 4.6.7 and refresh compatible transitive dependencies to resolve the production dependency audit findings.

## [0.8.0] - 2026-10-23

### Added

- Living contract schema v2 with doctor migration, manual non-functional profiles, reusable fixtures and package contract includes. Scoped reads, owning-file mutations and Git revision drift support included contracts.
- Obsidian note projection with YAML metadata and wikilinks, grouped Canvas boards, and JSON/Mermaid/DOT coverage graphs.
- Local Jira/Xray/Zephyr/TestRail CSV/JSON import with atomic validated merges and conflict protection.
- TestRail/Qase definition bundles, Gherkin scenarios and Markdown release checklists; exports can filter by module, tags, priority and changed source/spec files since a Git revision.
- Unit and integration coverage plus manual QA definitions for migration, includes, fixtures, profiles, interoperability, portability and filters.

## [0.7.3] - 2026-10-16

### Changed

- Give `testweave update` a dedicated integration refresh screen with installed version, workspace, progress, contract and hook status, MCP paths, and verification/restart guidance. Unattended updates omit the setup banner and agent catalog. Package upgrades remain a separate package-manager operation.

## [0.7.2] - 2026-10-16

### Fixed

- Semantic drift retains changes to prop types and callback signatures in exported wrapped components, including nested wrappers, generic type arguments and referenced local functions, while still ignoring cosmetic edits.
- Doctor honors registered paths inside discovery-excluded folders in non-Git workspaces while preserving scan exclusions and skipping Git metadata and symbolic links.
- Scoped spec context uses the empty Git tree before the first commit, returning staged and untracked source/spec changes without failing to resolve HEAD. Invalid explicit revisions still fail.

## [0.7.1] - 2026-10-16

### Fixed

- Semantic filtering keeps changes to `let`, `const` and `var` and changes to separately exported functions, classes and variables, so they still require QA review.
- Anchored spec context includes only the selected section, in both the old and new versions, including for newly added spec files.
- Deleting a module that has a blocking linked spec change is now reported as a blocking issue.
- Source globs with brace patterns such as `src/**/*.{ts,tsx}` include every matching changed file in drafting context.
- Impact previews catch overlapping globs, such as `future/*/index.ts` and `future/auth/*.ts`, instead of reporting no coverage.
- Doctor no longer reports registered paths in excluded folders, such as `dist/`, as dead in Git workspaces.
- Interactive AI drafting uses the same comparison base as the drift report, so committed branch changes reach the provider.
- Spec files with brackets or other glob characters in their names are found when drafting.
- Aligned pushes no longer read commit history when there is no stale module to audit.

### Known limitations

- Doctor's exclusion fix applies to Git workspaces; the non-Git folder scan still skips excluded folders.

## [0.7.0] - 2026-10-15

### Added

- Scoped MCP contract indexes, file-matched modules, anchored spec slices, impact previews and locked case-level mutations.
- Compact MCP/AI JSON and progressive skill guides with compact entrypoints.
- Optional JS/TS semantic drift filtering, separate spec drift policy and per-commit justified pre-push bypass audits.
- Doctor diagnostics for dead source globs, orphaned modules and missing spec files/headings.
- Local CLI/MCP impact previews and a TTY drift resolver with reviewed mapping, local drafts and explicit AI drafting.
- Ollama, custom OpenAI-compatible and Gemini authoring with scoped context and schema validation.

### Changed

- Schema version 1 accepts optional docs/specs/refs pointers and docDriftMode; compact case defaults restore on validation. Schema version 2 remains a later milestone.
- TypeScript is a runtime dependency for local semantic analysis.

### Breaking changes

- ContractStore implementations must provide upsertCase and removeCase; upsert accepts an optional expected snapshot for interactive review.

### Known limitations

- Follow-up audit fixes are deferred from this release. Semantic filtering can miss declaration-kind and separately exported signature changes; use ordinary sync for conservative checks.
- Anchored spec diffs can include neighboring sections; review all provider-bound context before using hosted drafting. Brace globs and committed-change resolution can omit relevant drafting diffs.
- Spec-only module removal, future-glob impact matching, dead-path diagnostics and unnecessary bypass history lookups have known audit findings scheduled for follow-up.

## [0.6.0] - 2026-10-12

### Added

- Local `testweave scan` discovery for projects already in development, reading project context before source and inventorying modules, functions, routes, documented journey candidates, and automated tests.
- Read-only scan previews and JSON reports, custom context selection, and explicit `--apply` adoption of reviewable drafts while preserving existing modules, policy, test IDs, and Markdown.
- Focused skill guides for scan, init/setup, update, sync, doctor, generate, and MCP, plus separate contract-schema and functional-testing references.

### Changed

- Made `skills/testweave/` the authoritative skill bundle and removed duplicated documentation strings from the installer.
- Updated setup, refresh, and diagnostics to install and validate every bundled document; doctor repair restores missing or modified resources while preserving user files.
- Redesigned doctor terminal output with aligned diagnostic rows, relevant paths, installation and workspace details, a check summary, and repair guidance. JSON output and exit codes are unchanged.
- Expanded onboarding and workflow documentation for existing projects.

### Breaking changes

- `ContractStore` implementations must now provide `append(modules, expected)` for atomic, snapshot-checked scan adoption.
- `TESTWEAVE_REFERENCE_NAME` now points to `references/functional-testing.md`. The exported content constants remain available and load the authoritative Markdown. Refresh installed skill bundles with `testweave update --yes`; agents should follow the new `SKILL.md` links.

## [0.5.0] - 2026-10-11

### Added

- Verified project MCP registrations for 26 coding clients, including Codex, Gemini CLI, Amp, OpenCode, Kilo, and Mistral Vibe, integrated with setup, update, and doctor repair.
- Provider-aware `mcp config` and `mcp install` commands, with native JSON, JSONC, command-array, and TOML output and custom JSONC server-map injection.
- A sourced MCP compatibility guide covering all 79 skill-catalog agents, including manual registration instructions and explicit unverified cases.

### Changed

- Made universal agents with native MCP registrations individually selectable and detected existing supported project configuration.
- Preserved unrelated TOML settings, servers, and comments, and reused existing OpenCode and Kilo configuration alternatives.
- Bundled the provider guide in the npm package and ignored generated machine-specific Codex configuration.

## [0.4.0] - 2026-10-10

### Added

- Functional test taxonomy in test contracts with 12 explicit test types (`unit`, `integration`, `system`, `sanity`, `smoke`, `regression`, `uat`, `ui`, `api`, `interface`, `component`, `e2e`), synonym normalization, and vendor export mapping.
- Comprehensive `reference.md` QA reference documentation bundled and installed alongside `SKILL.md` for AI agent environments.
- Universal shell installer script (`scripts/install.sh`) supporting global npm and Homebrew installations with automated setup.
- Homebrew formula (`Formula/testweave.rb`) for HEAD tap installations.
- Automated MCP server configuration for Cursor (`.cursor/mcp.json`), Claude Code (`.mcp.json`), and VS Code (`.vscode/mcp.json`) in `init`, `setup`, and `update`.

### Changed

- Refactored IDE MCP integration to centralized `mcp.ts` module with robust JSONC comment preservation and validation.
- Enhanced QA prompt authoring to enforce functional test classification.
- Updated documentation with shell installer, Homebrew instructions, and MCP client details.

## [0.3.0] - 2026-10-10

### Added

- `testweave update` command to synchronize agent skills, IDE rules, and Git hooks to the latest definitions.
- Non-interactive `--yes` option for `update` to preserve current and detected integrations.

### Changed

- Enhanced Quickstart, package manager guide, and CLI reference with `update` command documentation.

## [0.2.0] - 2026-10-10

### Added

- Support for 79+ AI coding agent integrations across 23 universal and 56 dedicated environments.
- Interactive terminal multi-selector with fuzzy search, pagination, and real-time filtering.
- Retro ASCII banner and workspace setup overview for `testweave init` and new `setup` alias.
- Bundled `skills/testweave/SKILL.md` custom agent skill and automated injection.
- Automated GitHub Packages release pipeline publishing `@alexisrellon/testweave`.
- Non-interactive `--yes` flag to streamline automated and CI initialization.

### Changed

- Enhanced documentation with architecture diagrams, quickstart workflows, and MCP details.

## [0.1.0] - 2026-10-10

### Added

- CLI commands to initialize, diagnose, synchronize, and export manual QA contracts.
- Zod-validated Markdown contracts, Git drift enforcement, IDE integrations, and MCP tools.
- Jira, Xray, and Zephyr exports, plus OpenAI and Anthropic adapters.
- npm, pnpm, Yarn Classic, Yarn Plug'n'Play, and Bun installation coverage.
- Required pull-request CI, Dependabot updates, semantic release validation, and contribution templates.

### Changed

- Updated Anthropic SDK to 0.131.0 and Zod to 4.6.5 after dependency review and cross-platform checks.
- Kept the Node 20 runtime and type baseline; deferred incompatible SDK/CLI updates and the TypeScript 7 compiler migration.
- Enforced dependency engine compatibility during CI installation and added SDK request/response regression coverage.

### Fixed

- Windows short-path CLI entrypoint detection and package-manager smoke-test compatibility.
