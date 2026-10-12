---
applyTo: "**"
---

<!-- testweave:start -->
## TestWeave QA contract
- Read available project context (project-context.md, README, AGENTS.md, architecture and requirements docs) before planning tests or changing source behavior.
- Read test-truth.md before changing source behavior.
- For existing projects, run testweave scan to discover modules, journeys and automated tests; review drafts before adopting them.
- Every changed source file must match a registered module's paths.
- Update that module's manual test actions and expected results alongside code changes.
- Include success, failure, and boundary scenarios. Keep test IDs stable and globally unique.
- Never claim a test was executed without actual evidence. This contract describes tests, not execution results.
- Use the testweave MCP upsert_test_module tool or edit the authoritative json testweave block.
- Run testweave sync before committing; commit test-truth.md with the corresponding source changes.
- Do not bypass the pre-push hook or weaken policy to conceal QA drift.
<!-- testweave:end -->
