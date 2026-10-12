# MCP clients and contract tools

```sh
testweave mcp config --provider codex
testweave mcp install --provider codex
testweave mcp install --config .custom/mcp.json --key customServers
testweave mcp
```

`mcp` starts the stdio server. Client setup must use the installed executable with the intended project `--cwd`. `mcp config` prints configuration; `mcp install` writes a verified provider's project registration or a custom workspace JSON/JSONC entry.

Use either `--provider` or custom `--config`/`--key` options. Configuration export also accepts `--format json|toml`; provider output must match its native format. Generic exports default to JSON with the `mcpServers` key. Existing servers and supported comments are preserved; malformed configuration requires repair.

Read the `living-test-contract` resource to inspect the authoritative Markdown. Available tools are:

- `analyze_code_drift`: read-only working-tree QA check with optional `base` and `strict`; missing upstream requires an explicit base.
- `upsert_test_module`: creates or replaces a complete module by ID. Include all scenarios to retain and preserve test IDs.
- `generate_qa_export`: returns test definitions without writing files or uploading them; JSON requires `projectKey`.

Read [the contract schema](../references/contract-schema.md) before upserting modules. CLI [scan](scan.md) provides local discovery; it is not an MCP tool.
