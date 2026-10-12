# Adopt an existing project

Read project documentation before designing tests. Use scan to inventory an existing codebase before adding its QA baseline.

```sh
testweave scan
testweave scan --context docs/product-context.md --json
testweave scan --apply
```

- Default scan is a read-only preview. `--json` returns project context text, function/route/test evidence, documented journey candidates and validated module drafts.
- `--context <file>` prioritizes a workspace-relative context document; available standard context and package manifests are also read before implementation files.
- `--apply` creates a contract if needed and appends drafts only for uncovered files tracked by its existing policy. Authored modules, IDs, policy and surrounding Markdown are preserved. Repeating a scan on unchanged covered files adds nothing.
- Scan works without an AI provider. It uses filename and text heuristics, groups uncovered files by directory, and does not execute tests or certify coverage.
- Git projects exclude ignored untracked files; non-Git projects use built-in dependency/build exclusions. Linked, binary, missing and files over 256 KB are skipped. More than 10,000 files fails with guidance to narrow scope. Invalid explicitly selected context fails before applying drafts.

Review the source evidence and context. Replace `needs-review` TODOs with specific actors, preconditions, fixtures, actions and acceptance criteria. Verify source tracking and module paths using [the contract schema](../references/contract-schema.md), then commit the reviewed baseline. Use [init](init.md) to install integrations and hooks; scan only manages discovery and contract adoption.
