# Import manual QA definitions

```sh
testweave import qa/legacy.csv --source xray --module authentication --paths 'src/auth/**'
testweave import qa/testrail.json --source testrail --format json --module authentication
```

Sources: `jira`, `xray`, `zephyr`, `testrail`; formats: CSV (default), JSON. Input must be a workspace file of at most 10 MB. A new module requires comma-separated `--paths`; `--name` sets its display name. Existing modules retain authored paths, specs and scenarios. IDs must be stable and globally unique. Reimporting identical definitions is safe; conflicting existing cases are rejected for review, with no partial contract write.

Supported layouts include generated Jira issue bundles, Xray arrays/step CSV, Zephyr case-and-step bundles/continuation CSV, TestRail `cases`/`tests` JSON (including `custom_steps_separated`) and CSV with ID, Title, Preconditions, Steps and Expected Result columns. CSV quoting, commas, escaped quotes and multiline steps are supported. Unknown vendor layouts must be mapped to these columns first. Rows without actionable steps and expected outcomes are rejected. Imports only author definitions; execution results are never stored.

See [generate](generate.md) for portable exports and [contract schema](../references/contract-schema.md) for validation rules.
