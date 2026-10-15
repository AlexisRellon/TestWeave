# Diagnose and repair setup

```sh
testweave doctor
testweave doctor --json
testweave doctor --fix
```

The terminal report shows a diagnostics heading, aligned OK/FAIL rows with relevant file paths, installation and workspace details, and a passed/total check summary. Disabled hooks appear as information and are not counted. Failed checks include automatic or manual repair guidance; `--fix` reports the final results after repair. `--json` emits only the diagnostic array for scripts.

Doctor validates the contract, setup configuration, selected IDE rules/MCP registrations, every managed skill document, and enabled Git hook. Missing, outdated or modified command/reference files make the skill installation unhealthy.

It also reports `dead-path` for module globs matching no existing workspace files, `orphaned-module` when all of a module's paths are dead, and `dead-spec` for missing linked docs/specs or heading anchors. These are non-repairable findings: inspect and update pointers/scenarios manually. Doctor never deletes definitions to hide these problems.

`--fix` repairs supported missing or outdated integrations using the package's authoritative bundle. It preserves authored contracts, surrounding IDE instructions, other MCP servers and unrelated files in skill directories. Malformed contracts or unsupported configuration problems require manual repair; inspect diagnostics before editing them.

Exit code 0 means healthy diagnostics, 1 means unresolved checks, and 2 means an operational error. Use [update](update.md) to change selected integrations or refresh definitions after an upgrade.
