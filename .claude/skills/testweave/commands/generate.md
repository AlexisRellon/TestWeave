# Export QA definitions or draft a module

## Export

```sh
testweave generate --target xray --format csv --output qa/xray-tests.csv
testweave generate --target jira --format json --project-key PROJ
```

Targets are `jira`, `xray` and `zephyr`; formats are `csv` and `json`. Defaults are Xray CSV. JSON requires `--project-key`. Omit `--output`, or use `--output -`, for stdout. File output must be within the workspace and cannot overwrite an existing file.

Exports contain definitions, not execution results. Review the artifact before importing it; generate does not upload cases.

## Optional AI drafting

```sh
testweave generate --provider openai --model <model-id> --context docs/approved-context.md
testweave generate --provider anthropic --model <model-id> --context docs/approved-context.md --module authentication
```

AI drafting requires an explicit provider, model and either `--context` or `--module`. Context accepts a heading pointer such as `docs/auth.md#login`. Module drafting includes linked sections, the selected module and uncommitted Git diff hunks. Choose context appropriate to send. Use `--compact` for compact prompts and JSON drafts.

Providers: `openai` (`OPENAI_API_KEY`), `anthropic` (`ANTHROPIC_API_KEY`), `gemini` (`GEMINI_API_KEY`), `ollama` (default `http://localhost:11434/v1`, no key required), and `custom --base-url <url>` (optional `TESTWEAVE_API_KEY`). Ollama also accepts `--base-url`. Compatible endpoints must support Chat Completions with JSON schema output; incomplete, refused or invalid responses fail validation. No live endpoint is needed for core commands.

```sh
testweave generate --provider ollama --model <local-model> --module authentication --compact
testweave generate --provider custom --base-url http://localhost:1234/v1 --model <model> --context docs/auth.md#login
testweave generate --provider gemini --model <model> --module authentication
```

Drafts are schema-validated and emitted for review; generate does not apply them to the contract. With `--module`, preserve the existing identity and retain required scenarios when applying the complete draft. Read [the contract schema](../references/contract-schema.md) and [functional testing](../references/functional-testing.md) to review its quality.
