# Review QA definition changes

```sh
testweave diff --base origin/main --format markdown
testweave diff --base HEAD --format json
testweave sync --base origin/main --strict --format github
testweave ui
testweave view --port 4317
```

`diff` compares a Git contract snapshot, including package includes, against current definitions. Text, Markdown and JSON summarize added/removed modules and test IDs, changed steps and expected outcomes, NFT profiles, paths, specs, fixtures and policy. Formatting and object-key ordering alone do not count. `--format github` provides a Markdown summary and writes it to `GITHUB_STEP_SUMMARY` when set.

`sync --format github` emits escaped workflow annotations and a Markdown summary combining drift and semantic contract changes. It retains sync policy and exit codes. Fetch the chosen base revision in CI before comparing it.

`ui` (`view`) starts a loopback HTTP viewer and prints its URL. The default selects an available port; `--port` selects one explicitly. Stop it with Ctrl+C. It needs no cloud, API key or frontend build service.

The viewer contains a filterable scenario/NFT catalog, a dedicated test-document table (`ID`, `Title`, `Preconditions`, ordered `#`/`Action`/`Data`/`Expected` step subcolumns, `Priority`, and browser-local `Pass / Fail` and `Comment` notes), live drift diagnostics and impact previews, an interactive coverage graph, semantic before/after changes, and filtered export downloads. It refreshes from workspace changes. Catalog, test-document table, and exports remain available without Git; unavailable comparison sections show errors. Inspection, downloads, and browser-local notes never modify `test-truth.md` or exported artifacts.
