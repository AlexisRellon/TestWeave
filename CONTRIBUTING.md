# Contributing to TestWeave

Bug reports, documentation improvements, new integrations, and code contributions are welcome. Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Use [issues](https://github.com/AlexisRellon/TestWeave/issues) for reproducible bugs and feature proposals, and [Discussions](https://github.com/AlexisRellon/TestWeave/discussions) for questions. Discuss substantial behavior or schema changes before implementing them.

## Development setup

Install Git and Node.js 20 or later. Fork the repository, clone your fork, and create a branch from current `main`.

```sh
git clone https://github.com/YOUR_USERNAME/TestWeave.git
cd TestWeave
git switch -c fix/describe-the-change
npm ci
npm run check
node dist/cli/index.js --help
```

The repository uses npm and `package-lock.json` for reproducible contributor and CI installs. The distributed CLI supports npm, pnpm, Yarn Classic, Yarn Plug'n'Play, and Bun. Do not commit additional repository lockfiles. No API key is needed to run the test suite.

## Make and validate a change

- Keep TypeScript strict, export public interfaces, avoid `any`, and inject external dependencies where practical.
- Use asynchronous filesystem APIs in product code. Preserve user configuration and unrelated file content.
- Add meaningful regression tests for changed behavior, particularly drift enforcement, hooks, path handling, and structured outputs.
- Run `npm run check` for type checks, build, and tests, then `npm pack --dry-run` to inspect packaging.
- Update the README and the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) for user-visible changes. State migration steps for breaking changes.
- Run `npm run bundle:source` when source, scripts, package metadata, or workflows change. Commit the refreshed `IMPLEMENTATION.md`.
- Keep credentials, real customer test data, generated output, and local tool installations out of commits.

The source layers are `src/cli` and `src/mcp` (interfaces), `src/engine` (contract and drift logic), `src/llm` (provider adapters), and `src/integrations` (hooks, IDEs, exports). Tests live in `tests`; release-policy tests live in `scripts`.

For package-manager changes, CI installs the actual tarball on Linux and Windows and tests CLI, MCP, and real Git push enforcement. To reproduce a matrix entry locally:

```sh
npm pack
npm install --prefix .manager-tools --no-save pnpm@10 yarn@1 @yarnpkg/cli-dist@4 bun@1 --no-audit --no-fund
npm run check:manager -- yarn-pnp
```

Available manager names are `npm`, `pnpm`, `yarn-classic`, `yarn-pnp`, and `bun`.

## Pull requests

Open a focused PR against `main` and complete the template. Use a Conventional Commit title:

```text
feat(export): add a Jira field
fix(hooks): preserve pre-push input
docs: clarify package-manager setup
feat(schema)!: change the contract format
```

Accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`. A scope is optional; `!` marks a breaking change. Individual commits need not follow this format because PRs are squash merged.

`main` requires a pull request, an up-to-date branch, resolved review conversations, and the `CI required` check. This check succeeds only when metadata/title checks, every Node/OS test job, and every package-manager job succeed. Failed, cancelled, or skipped prerequisite jobs block it. Administrators follow the same restrictions; force pushes and branch deletion are disabled.

Maintainers review contributions and may request changes. A fixed approval count is not enforced while the project has a single maintainer; required CI cannot be bypassed. Fork PRs use read-only workflow permissions and do not receive repository secrets. GitHub may require maintainer approval before running a first-time contributor's workflow.

## Dependencies and releases

Dependabot proposes npm and GitHub Actions updates weekly. Minor and patch updates are grouped; npm major updates remain separate. Dependency PRs pass the same checks and are not automatically merged.

Maintainers follow [RELEASING.md](RELEASING.md). Contributors normally add changelog entries without changing the package version. Contributions are licensed under the repository's [MIT license](LICENSE); no CLA is required.
