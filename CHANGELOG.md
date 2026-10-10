# Changelog

User-visible changes are recorded here. Releases follow [Semantic Versioning](https://semver.org/); the release format and process are documented in [RELEASING.md](RELEASING.md).

## [Unreleased]

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
