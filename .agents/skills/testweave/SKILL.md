---
name: testweave
description: Keep manual QA contracts aligned with source changes through TestWeave CLI and MCP tools. Use when adopting an existing project, inspecting or changing code, maintaining test-truth.md, checking QA drift, or exporting functional test definitions.
---

# TestWeave QA Contract Skill

Maintain functional QA scenarios in `test-truth.md` alongside the behavior they describe. Read only the command and reference documents relevant to the task.

## Shared workflow

1. Read available project context first: project-context.md, README, AGENTS.md, architecture, requirements and user-journey documentation. Use it to understand existing behavior and acceptance criteria.
2. Read `test-truth.md` before changing behavior. Every changed source file must match a registered module's paths.
3. Update the affected module's scenarios alongside its code. Preserve existing module and globally unique test IDs, and include success, failure and boundary cases.
4. Distinguish test definitions from execution evidence. Never claim tests ran without evidence. Discovery drafts marked `needs-review` require specific inputs and observable expected outcomes.
5. Run `testweave sync` against an available baseline and resolve drift before committing code and contract together. Preserve enforcement policy and Git hooks.

## Choose the command guide

| Task | Read |
| --- | --- |
| Adopt an existing project; discover modules, functions, journeys and tests | [commands/scan.md](commands/scan.md) |
| Initialize a workspace and select agent integrations | [commands/init.md](commands/init.md) |
| Refresh installed skills, rules, MCP registrations and hooks | [commands/update.md](commands/update.md) |
| Check changes against the QA contract; interpret drift | [commands/sync.md](commands/sync.md) |
| Diagnose or repair workspace setup | [commands/doctor.md](commands/doctor.md) |
| Export QA definitions or request an AI module draft | [commands/generate.md](commands/generate.md) |
| Configure MCP clients or maintain contracts through MCP | [commands/mcp.md](commands/mcp.md) |

## References

- Read [references/contract-schema.md](references/contract-schema.md) when authoring or validating modules, paths and test cases.
- Read [references/functional-testing.md](references/functional-testing.md) when choosing test types or designing functional scenarios.
