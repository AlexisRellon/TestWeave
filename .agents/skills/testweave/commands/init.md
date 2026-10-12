# Initialize a workspace

```sh
testweave init
testweave setup --yes
testweave init --yes --no-hook
```

`setup` aliases `init`. Interactive setup selects integrations; `--yes` accepts existing or default selections. `--no-hook` skips Git hook installation.

Setup creates or validates `test-truth.md`, saves selections in `.testweave.json`, installs this skill bundle and IDE rules, configures MCP for selected verified clients, and installs a pre-push hook when enabled and Git is available. Existing contract content is preserved; invalid contracts require repair.

A new contract starts with no modules. For a project already in development, follow [scan](scan.md), review its drafts against project context and commit the QA baseline. For a new project, author modules using [the contract schema](../references/contract-schema.md). Run [doctor](doctor.md) to check installation.
