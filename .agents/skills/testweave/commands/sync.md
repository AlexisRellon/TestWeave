# Check QA drift

```sh
testweave sync
testweave sync --base origin/main --strict --json
```

Use an available repository revision for `--base`. Without it, working-tree checks require a resolvable upstream. `--strict` blocks drift even under warning policy; `--json` returns a structured report.

Every changed tracked source file needs module coverage. An existing affected module needs changes to its description or test content; renaming it, editing paths or reordering tests does not clear stale documentation. Review whether the updated scenarios describe the actual behavior change.

- `unmapped`: add relevant scenarios with matching paths or extend the appropriate module.
- `stale-module`: revise the affected module's scenarios and regression expectations.
- `removed-module`: retain coverage and document retired behavior.

Both baseline and current tracking policies and module paths are considered. Weakening policy cannot conceal drift. When paths overlap, all affected modules need review.

The installed hook uses `--pre-push` and reads ref updates from stdin to inspect committed snapshots. A dirty contract cannot make a stale committed push pass.

Exit codes: 0 for alignment or non-strict warning drift, 1 for blocked drift, and 2 for operational/schema errors. A passing sync establishes documentation alignment; it does not prove test execution or scenario quality.
