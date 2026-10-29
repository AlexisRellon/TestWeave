# Check QA drift

```sh
testweave sync
testweave sync --base origin/main --strict --json
testweave sync --base origin/main --strict --format github
```

Use an available repository revision for `--base`. Without it, working-tree checks require a resolvable upstream. `--strict` blocks drift even under warning policy; `--json` returns a structured report.

`--format github` emits workflow annotations and combines drift with semantic contract changes in a Markdown summary, appending to `GITHUB_STEP_SUMMARY` when available. See [review guidance](review.md).

Every changed tracked source file needs module coverage. An existing affected module needs changes to its description or test content; renaming it, editing paths or reordering tests does not clear stale documentation. Review whether the updated scenarios describe the actual behavior change.

- `unmapped`: add relevant scenarios with matching paths or extend the appropriate module.
- `stale-module`: revise the affected module's scenarios and regression expectations.
- `removed-module`: retain coverage and document retired behavior.
- `stale-spec`: linked spec section changed without a QA update. Unrelated headings do not trigger it. `policy.docDriftMode` defaults to `warn`; `block` enforces and `ignore` suppresses spec drift. Baseline enforcement cannot be weakened by the current contract; `--strict` blocks reported spec drift.

`sync --semantic` ignores comments, formatting, local variable renames and erased type-only changes for parsed JavaScript/TypeScript. Observable runtime changes, unsupported languages, invalid syntax, added/deleted files and reflective eval/with code retain drift. This is a conservative heuristic, not a behavior proof.

`sync --interactive` requires a TTY and cannot combine with JSON or pre-push. Choose mapping, local needs-review scaffolding, or AI drafting with explicit `--provider` and `--model` (optional `--base-url`). Review the preview before applying. Cancellation preserves definitions. Mapping alone does not acknowledge stale tests; drafts still need authored acceptance criteria. The command reruns drift after changes.

For an audited internal refactor, each affected commit may include `Testweave-Bypass: authentication (pure internal refactor)` or `@testweave-skip authentication (reason)` on its own line. `sync --pre-push` clears only that module's stale-code issue when every affected commit has a nonempty reason. Reports retain commit SHAs and reasons. It never clears unmapped, removed-module or spec drift, changes the contract, or trusts dirty working files. Ordinary sync ignores bypasses; first pushes with an empty-tree baseline do not apply them.

Both baseline and current tracking policies and module paths are considered. Weakening policy cannot conceal drift. When paths overlap, all affected modules need review.

The installed hook uses `--pre-push` and reads ref updates from stdin to inspect committed snapshots. A dirty contract cannot make a stale committed push pass.

Exit codes: 0 for alignment or non-strict warning drift, 1 for blocked drift, and 2 for operational/schema errors. A passing sync establishes documentation alignment; it does not prove test execution or scenario quality.
