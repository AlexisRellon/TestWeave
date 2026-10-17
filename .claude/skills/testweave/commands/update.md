# Refresh TestWeave integrations

```sh
testweave update
testweave update --yes
testweave update --yes --no-hook
```

Use update after upgrading TestWeave or changing selected agents. Interactive update can change integrations; `--yes` uses existing or detected/default selections.

The refresh screen shows the installed version, workspace, contract status, integration progress, MCP configuration paths and hook status, followed by verification and client restart guidance. It uses the installed package's definitions; it does not download or upgrade the TestWeave package.

Update refreshes the entire managed skill bundle, IDE rules, selected MCP launch paths, setup configuration and enabled hooks. It validates the contract while preserving its authored modules and tests. Command and reference documents come from the installed package's `skills/testweave/` bundle; edit that source bundle when developing TestWeave.

Missing or modified managed skill files are restored on refresh. Unrelated user files in the installed skill directory are preserved. Restart affected MCP clients after registration changes. Use [doctor](doctor.md) to verify or repair setup.
