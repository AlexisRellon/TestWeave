# Changelog

User-visible changes are recorded here. Releases follow [Semantic Versioning](https://semver.org/); the release format and process are documented in [RELEASING.md](RELEASING.md).

## [Unreleased]

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
