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

AI drafting requires an explicit provider, model and context file. Credentials come from `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Only that context and the selected existing module, when requested, are sent to the provider. Choose context that is appropriate to send.

Drafts are schema-validated and emitted for review; generate does not apply them to the contract. With `--module`, preserve the existing identity and retain required scenarios when applying the complete draft. Read [the contract schema](../references/contract-schema.md) and [functional testing](../references/functional-testing.md) to review its quality.
