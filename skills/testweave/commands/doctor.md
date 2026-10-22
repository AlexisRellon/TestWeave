# Diagnose and repair setup

```sh
testweave doctor
testweave doctor --json
testweave doctor --fix
```

The terminal report shows a diagnostics heading, aligned OK/FAIL rows with relevant file paths, installation and workspace details, and a passed/total check summary. Disabled hooks appear as information and are not counted. Failed checks include automatic or manual repair guidance; `--fix` reports the final results after repair. `--json` emits only the diagnostic array for scripts.

Doctor validates the contract, setup configuration, selected IDE rules/MCP registrations, every managed skill document, and enabled Git hook. Missing, outdated or modified command/reference files make the skill installation unhealthy.

The `schema-version` diagnostic identifies v1 documents. `--fix` migrates root and included v1 contracts to v2 with validation, locking and prose preservation. Fixture references are checked for missing keys, cycles and excessive expansion; broken include graphs are reported as contract errors. Repair never invents missing fixtures or package contracts.

It also reports `dead-path` for module globs matching no existing workspace files, `orphaned-module` when all of a module's paths are dead, and `dead-spec` for missing linked docs/specs or heading anchors. These are non-repairable findings: inspect and update pointers/scenarios manually. Doctor never deletes definitions to hide these problems.

Registered paths in discovery-excluded folders are checked in both Git and non-Git workspaces. Non-Git checks skip Git metadata and symbolic links; scan keeps its normal discovery exclusions.

`--fix` repairs supported missing or outdated integrations using the package's authoritative bundle. It preserves authored contracts, surrounding IDE instructions, other MCP servers and unrelated files in skill directories. Malformed contracts or unsupported configuration problems require manual repair; inspect diagnostics before editing them.

Exit code 0 means healthy diagnostics, 1 means unresolved checks, and 2 means an operational error. Use [update](update.md) to change selected integrations or refresh definitions after an upgrade.
