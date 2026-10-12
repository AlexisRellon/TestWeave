# Changelog

User-visible changes are recorded here. Releases follow [Semantic Versioning](https://semver.org/); the release format and process are documented in [RELEASING.md](RELEASING.md).

## [Unreleased]

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
