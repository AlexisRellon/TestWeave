# MCP clients and contract tools

```sh
testweave mcp config --provider codex
testweave mcp install --provider codex
testweave mcp install --config .custom/mcp.json --key customServers
testweave mcp
```

`mcp` starts the stdio server. Client setup must use the installed executable with the intended project `--cwd`. `mcp config` prints configuration; `mcp install` writes a verified provider's project registration or a custom workspace JSON/JSONC entry.

Use either `--provider` or custom `--config`/`--key` options. Configuration export also accepts `--format json|toml`; provider output must match its native format. Generic exports default to JSON with the `mcpServers` key. Existing servers and supported comments are preserved; malformed configuration requires repair.

Prefer scoped tools; the `living-test-contract` resource remains available for full Markdown inspection. Start with `mcp --compact` to omit default empty preconditions/tags and regression types in JSON responses.

- `get_contract_index`: module IDs, paths, spec pointers and test IDs/titles only.
- `get_modules_for_files(paths)` / `get_module_by_path(path)`: matching modules only.
- `get_spec_slice(pathOrModuleId)`: referenced Markdown heading sections, uncommitted Git hunks and test headers. Duplicate headings use `-1`, `-2` suffixes.

Scoped spec reads also work before the first Git commit, comparing staged and untracked additions with the empty tree. Invalid explicit baselines remain errors.
- `impact(paths)`: planned paths/globs to modules, spec sections, test IDs and preconditions. CLI: `testweave impact 'src/auth/**' --json`.
- `upsert_test_case(moduleId, testCase)` / `remove_test_case(moduleId, testId)`: locked case edits preserving unrelated tests and prose. IDs remain globally unique; the final case cannot be removed. Removing an absent ID is idempotent.

- `analyze_code_drift`: read-only working-tree QA check with optional `base`, `strict`, `semantic`; missing upstream requires an explicit base.
- `upsert_test_module`: creates or replaces a complete module by ID. Include all scenarios to retain and preserve test IDs.
- `generate_qa_export`: returns test definitions without writing files or uploading them; JSON requires `projectKey`.

Read [the contract schema](../references/contract-schema.md) before upserting modules. CLI [scan](scan.md) provides local discovery; it is not an MCP tool.
