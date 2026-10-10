# TestWeave

[![CI](https://github.com/AlexisRellon/TestWeave/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexisRellon/TestWeave/actions/workflows/ci.yml)

TestWeave keeps manual QA definitions alongside source code in `test-truth.md`. It provides a Node.js 20+ CLI, a local MCP server, Git pre-push enforcement, and Jira/Xray/Zephyr exports. Git must be installed for drift checks and hooks.

## Run from this checkout

```sh
git clone https://github.com/AlexisRellon/TestWeave.git
cd TestWeave
npm ci
npm run check
node dist/cli/index.js --help
node dist/cli/index.js --cwd /path/to/project init
```

## Package managers

The published package format supports **npm, pnpm, Yarn Classic, modern Yarn (including Plug'n'Play), and Bun**. Install a project dev dependency to keep hooks and IDE integrations attached to a durable installation.

This repository has not been published to npm. Use the provided tarball or build one with `npm pack`; these commands install that local artifact:

| Package manager | Install the tarball in your project | Run the installed CLI |
| --- | --- | --- |
| npm | `npm install --save-dev /path/to/testweave-0.1.0.tgz` | `npx --no-install testweave init` |
| pnpm | `pnpm add --save-dev /path/to/testweave-0.1.0.tgz` | `pnpm exec testweave init` |
| Yarn Classic / modern | `yarn add --dev testweave@file:/path/to/testweave-0.1.0.tgz` | `yarn run testweave init` |
| Bun | `bun add --dev /path/to/testweave-0.1.0.tgz` | `bun run testweave init` |

On Windows, quote paths containing spaces and use forward slashes for Yarn file references, for example `yarn add --dev "testweave@file:C:/Downloads/testweave-0.1.0.tgz"`.

Once the package is published, use the package name `testweave` instead of the tarball reference. Registry-based one-off execution is also supported:

| Package manager | One-off execution after publication |
| --- | --- |
| npm | `npx testweave init` |
| pnpm | `pnpm dlx testweave init` |
| Yarn 2+ | `yarn dlx testweave init` |
| Bun | `bunx testweave init` |

Yarn Classic requires installing the package before `yarn run testweave`; it has no `dlx` command. Bun installs and invokes the package while its Node shebang keeps **Node.js 20+** as the runtime. This support does not require forcing execution with `bunx --bun`.

All commands below use npm's runner for illustration. Substitute `pnpm exec testweave`, `yarn run testweave`, or `bun run testweave` for `npx testweave` to use the same commands with your manager. In monorepos, add TestWeave to the workspace from which you run it and select the repository with `--cwd`.

Package-manager references: [pnpm exec](https://pnpm.io/cli/exec), [pnpm dlx](https://pnpm.io/cli/dlx), [Yarn run](https://yarnpkg.com/cli/run), [Yarn dlx](https://yarnpkg.com/cli/dlx), [Bun runners](https://bun.sh/docs/pm/bunx).

```sh
npx testweave init
npx testweave init --yes
npx testweave doctor
npx testweave doctor --fix
npx testweave sync
npx testweave sync --base origin/main --strict
npx testweave generate --target xray --format csv --output qa.csv
npx testweave generate --target zephyr --format json --project-key QA --output qa.json
npx testweave mcp
```

Use global `--cwd <directory>` to select a project. Inside a Git repository, TestWeave uses its top-level directory. `generate` writes to stdout unless given `--output`; output files must be new files inside the workspace. Existing files are never overwritten.

Exit codes: **0** success (including warning-mode drift), **1** blocked drift or failed diagnostics, **2** operational/validation errors. Commander usage errors return **1**.

## The contract

The authoritative data is exactly one **top-level** fenced block with language `json` and metadata `testweave`. Both backtick and tilde fences are accepted. Prose outside the block is preserved by module upserts.

~~~json testweave
{
  "schemaVersion": 1,
  "project": "Example",
  "policy": {
    "mode": "block",
    "sourceGlobs": ["src/**/*.{ts,tsx}"],
    "ignoreGlobs": ["**/*.d.ts"]
  },
  "modules": [
    {
      "id": "authentication",
      "name": "Authentication",
      "description": "Registered users sign in and receive clear errors for invalid credentials.",
      "paths": ["src/auth/**"],
      "tests": [
        {
          "id": "AUTH-001",
          "title": "Valid user signs in",
          "priority": "high",
          "preconditions": ["A registered test account exists"],
          "steps": [
            {
              "action": "Submit the test account credentials",
              "data": "Use a designated test account; do not record its password here",
              "expected": "The dashboard opens and displays the signed-in user"
            }
          ],
          "tags": ["smoke"]
        }
      ]
    }
  ]
}
~~~

The exact schema is exported from `src/schema/test-truth.ts`. Objects are strict. Module IDs and test IDs are unique; test IDs are unique across the entire contract. Each module requires positive relative POSIX globs and at least one test with at least one action/expected-result pair. Priorities are `low`, `medium`, `high`, or `critical`. No execution status is inferred.

Initialization creates an empty, valid contract. It does not invent coverage: register modules before pushing source files. Default source globs cover common programming languages, SQL, and shell scripts; generated output and declaration files are ignored. Adjust these globs for your project, including templates, configuration, or other behavior-bearing files as needed.

## Drift semantics

- `sync` compares the working tree, staged changes, and untracked files against the upstream commit, or an explicit `--base`.
- Pre-push reads Git's ref-update stream and compares the **committed local SHA being pushed** against the remote SHA. An uncommitted documentation fix cannot make a stale push pass.
- For a new remote branch, an available upstream is used; without one, an empty tree is the baseline and all source files require module coverage.
- Deletions are skipped at the ref level. File renames are treated as deletion plus addition so both paths are considered.
- Every affected module must have changed test content or description. Module renaming, path-only edits, formatting, and test-case reordering do not count. Updating an unrelated module does not clear drift.
- Both baseline and current source policies are used. A branch cannot hide drift by weakening its own ignore rules or switching an upstream blocking policy to warning mode.
- Unknown source files are reported. Removing an affected module is reported; retain a retirement scenario documenting removed behavior until the removal is integrated.
- `warn` mode reports drift with exit 0; `--strict` enforces blocking. Invalid contracts and unavailable revisions are always errors.
- A missing upstream is actionable, not silently ignored. Use `--base`, configure tracking, or fetch missing remote history. TestWeave does not fetch automatically.

Detection is conservative and file-based: it does not prove that code logic changed, that QA steps are sufficient, or that tests were executed. Cosmetic changes to a monitored source file may require a documentation update. Git hooks can be bypassed, so use CI for shared enforcement.

## Integrations and doctor

`init` detects Git, Cursor, Claude, VS Code, Husky, and common CI files with `existsSync`, displays them, and prompts for integrations and confirmation. `--yes` chooses Cursor and Claude plus detected IDEs; `--no-hook` skips the hook. Selections are stored in `.testweave.json`.

Cursor and Claude rules live in managed blocks in `.cursorrules` and `CLAUDE.md`. VS Code receives auto-discovered `.github/instructions/testweave.instructions.md` and a `testweave` stdio entry in `.vscode/mcp.json`. Existing JSONC comments and unrelated servers are preserved.

The default hook is `.git/hooks/pre-push`, installed with mode 0755. Git's configured hook directory and worktrees are respected. For Husky v9's `.husky/_` dispatcher, TestWeave installs `.husky/pre-push`. Existing hooks are preserved as `pre-push.testweave-original`; both hooks receive the same stdin and arguments. A failing original hook still blocks the push.

Hooks and VS Code MCP entries reference the current Node executable and installed CLI path, so normal Git and IDE execution does not call a package manager. When initialized under Yarn Plug'n'Play, they also include the active PnP dependency loader and its ESM loader, allowing Git and VS Code to start TestWeave outside a Yarn shell. Yarn PnP projects must have ESM loader support enabled (`pnpEnableEsmLoader: true` in `.yarnrc.yml`) because TestWeave is an ESM package. See [Yarn PnP](https://yarnpkg.com/features/pnp) and [loader settings](https://yarnpkg.com/configuration/yarnrc/).

Prefer a project dev dependency for a durable installation. After moving the repository, changing Node installations, switching package-manager layouts, or clearing a one-off execution cache, rerun `init --yes` or `doctor --fix` using your selected manager.

`doctor` checks contract validation, selected rule content, hook integrity, and executable bits on POSIX. Windows does not represent POSIX execution bits, so hook integrity is checked there. It offers repair in a terminal; `--fix` repairs without prompting. Missing contracts can be bootstrapped, but invalid contracts and malformed managed markers are preserved for manual repair.

## MCP

`testweave mcp` uses stdio; stdout contains only MCP protocol messages. A typical MCP client configuration is:

```json
{
  "mcpServers": {
    "testweave": {
      "command": "npx",
      "args": ["--no-install", "testweave", "--cwd", "/absolute/project/path", "mcp"]
    }
  }
}
```

For other package managers, replace `command` and the initial `args` as follows, then append `["--cwd", "/absolute/project/path", "mcp"]`:

| Manager | `command` | Initial `args` |
| --- | --- | --- |
| npm | `npx` | `["--no-install", "testweave"]` |
| pnpm | `pnpm` | `["exec", "testweave"]` |
| Yarn | `yarn` | `["run", "testweave"]` |
| Bun | `bun` | `["run", "testweave"]` |

Set the MCP client's working directory to the project containing the installed dependency when using these runner configurations. TestWeave's `--cwd` selects the analyzed repository; it does not change where a package manager resolves the binary.

VS Code uses a `servers` object instead; its entry is generated by `init` and works without a package-manager process, including Yarn PnP. The resource URI is generated with `pathToFileURL`, including proper Windows drive letters and URL escaping.

| Capability | Behavior |
| --- | --- |
| Living contract resource | `file:///<workspace>/test-truth.md`, MIME `text/markdown` |
| `analyze_code_drift` | Optional `base` and `strict`; returns the drift report |
| `upsert_test_module` | Requires a complete `module`; validates and creates/replaces by ID |
| `generate_qa_export` | `target`, `format`, optional `projectKey`; returns export contents |

MCP cannot choose arbitrary file destinations or invoke AI APIs. Upserts are serialized with an exclusive lock, revalidate the full contract, and use atomic replacement. A crashed writer may leave `test-truth.md.lock`; remove it only after confirming no writer is active.

## Export profiles

| Target | CSV | JSON |
| --- | --- | --- |
| Jira | Issue rows, manual steps in Description | Jira external-system import `projects[].issues[]` |
| Xray | Test Case Importer rows grouped by Test Case Identifier | Manual test import objects with `fields` and `steps` |
| Zephyr Scale | Step-by-step CSV; blank metadata on continuation rows | TestWeave REST bundle containing separate case and step request bodies |

JSON needs a destination project key. Zephyr JSON is a request bundle for an integration to consume, not a single native bulk-import payload: create each case, then send its `testSteps` body to the resulting case key. TestWeave only writes artifacts; it does not contact Jira, Xray, or Zephyr.

Configure CSV field mappings in your destination importer. Issue types, priority names, required custom fields, and import availability vary by product edition and project. These exports describe test definitions, not execution results. CSV quotes commas, quotes, and line breaks and prefixes formula-like cells with an apostrophe for spreadsheet safety.

## Optional AI drafting

```sh
npx testweave generate --provider openai --model YOUR_MODEL --context qa-context.md --output auth-draft.json
npx testweave generate --provider anthropic --model YOUR_MODEL --context qa-context.md --module authentication --output auth-draft.json
```

Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in your environment. An explicit provider, model, and context file are required. The supplied context file and optional existing module are sent to that provider; no repository-wide upload happens. OpenAI uses structured Responses output; Anthropic uses a forced structured tool response. Both results pass Zod validation, with bounded request timeouts and retries.

Review the draft, then apply it through `upsert_test_module` or edit the contract. Drafting never silently updates the contract or claims tests were run.

## CI and development

A GitHub Actions example for a consuming project, after installing TestWeave as a dev dependency:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
- run: npm ci
- run: npx --no-install testweave sync --base origin/main --strict
```

Use the actual PR target branch instead of `origin/main` when applicable. Do not run the baseline comparison against the same SHA as the checked revision.

For pnpm, use `pnpm install --frozen-lockfile` and `pnpm exec testweave sync --base origin/main --strict`. For modern Yarn, use `yarn install --immutable` and `yarn run testweave sync --base origin/main --strict` (Yarn Classic uses `--frozen-lockfile`). For Bun, use `bun install --frozen-lockfile` and `bun run testweave sync --base origin/main --strict`. Configure CI with your package manager's lockfile and cache.

`npm run check`, `pnpm run check`, `yarn run check`, and `bun run check` run strict TypeScript checks, build the CLI, and run contract, exporter, AI validation, Git, hook, CLI, and MCP tests. Temporary Git repositories and local bare remotes isolate integration tests. Real AI requests and vendor imports are not part of the automated suite.

Package-manager installation checks use the real tarball and validate local execution, doctor, generated MCP launchers, and Git push enforcement under npm, pnpm, Yarn Classic, Yarn PnP, and Bun. CI runs these on Windows and Linux. To reproduce locally:

```sh
npm install --prefix .manager-tools --no-save pnpm@10 yarn@1 @yarnpkg/cli-dist@4 bun@1 --no-audit --no-fund
npm pack
npm run check:manager -- npm
npm run check:manager -- pnpm
npm run check:manager -- yarn-classic
npm run check:manager -- yarn-pnp
npm run check:manager -- bun
```

The npm-based tool bootstrap above is only for this repository's verification fixtures; consumers can install and run TestWeave using their chosen manager.

The four layers are `src/cli` + `src/mcp`, `src/engine`, `src/llm`, and `src/integrations`. Public interfaces, schemas, and library entry points are exported from `src/index.ts`. `IMPLEMENTATION.md` contains the implementation in file-named Markdown code blocks.

API references: [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server), [OpenAI structured outputs](https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md), [Anthropic tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use), [VS Code instruction locations](https://code.visualstudio.com/docs/agent-customization/custom-instructions), [Xray Test Case Importer](https://docs.getxray.app/display/XRAYCLOUD/Importing+Tests+using+Test+Case+Importer), [Zephyr Scale API](https://support.smartbear.com/zephyr-scale-cloud/api-docs/).
