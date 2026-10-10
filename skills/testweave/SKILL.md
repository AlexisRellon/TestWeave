---
name: testweave
description: Keep manual QA contracts aligned with source changes through TestWeave CLI and MCP tools. Use when inspecting, adding, editing, or testing code to check test-truth.md, prevent QA drift, update test cases, and sync contracts.
---

# TestWeave QA Contract Skill

TestWeave keeps manual QA test contracts (`test-truth.md`) synchronized with source code modifications. Every change in system behavior must be matched by corresponding, updated test coverage in `test-truth.md`.

## Core Principles

1. **Evidence over assumptions**: Never claim a test was executed without actual evidence. This contract describes tests and acceptance criteria, not execution results.
2. **Read the contract first**: Inspect `test-truth.md` before altering source behavior.
3. **Path coverage**: Every modified source file must match at least one registered module's paths pattern.
4. **Synchronized updates**: When editing code, update that module's manual test actions and expected results in the same commit.
5. **Scenario diversity**: Include success, failure, and edge/boundary scenarios. Keep test IDs stable and globally unique.
6. **Zero drift before committing**: Run `testweave sync` before committing. Staged changes must pass without unmapped or stale module drift.
7. **Preserve policy**: Never bypass Git pre-push hooks or loosen warning policies to conceal QA drift.

## When to Use This Skill

- **Planning code changes**: Review which modules and test cases cover the files you will touch.
- **Adding new features**: Register new modules with comprehensive test plans and valid file paths.
- **Refactoring or fixing bugs**: Update existing manual test actions, expected results, or add regression test cases.
- **Pre-commit verification**: Run `testweave sync` to confirm zero QA drift.
- **System diagnostics**: Run `testweave doctor` to ensure configuration, agent rules, and hooks are intact.

## Test Categorization & Types

Test cases in `test-truth.md` support explicit functional testing types:
- `unit`: Unit testing for isolated logic, utilities, and components.
- `integration`: Integration testing for multi-component and service boundaries.
- `system`: System testing for complete end-to-end flows.
- `sanity`: Sanity testing for quick verification of targeted bug fixes.
- `smoke`: Smoke testing for fundamental build and readiness checks.
- `regression`: Regression testing to verify unchanged features remain functional.
- `uat`: User Acceptance Testing from the customer/operator perspective.
- `ui`: UI testing for interactive visual elements, CLI prompts, and layouts.
- `api`: API testing for MCP tool schemas, endpoints, and data contracts.
- `interface`: Interface testing between distinct subsystems (IDEs, Git hooks).
- `component`: Component testing for modular building blocks.
- `e2e`: End-to-end lifecycle verification.

For complete definitions, test design techniques (Boundary Value Analysis, Equivalence Partitioning), and authoring guidelines, see [reference.md](reference.md).

## Tools & Commands

### MCP Tools (when running in MCP-enabled agent)
- `get_contract`: Inspect the current QA contract, registered modules, paths, and test cases.
- `upsert_test_module`: Add or update a module in `test-truth.md` with stable test IDs, test types, actions, and expected results.
- `check_drift`: Verify whether working tree changes or diffs diverge from the QA contract.

### CLI Commands
- `testweave sync`: Check source changes against QA contract.
  - `--strict`: Block on drift even if policy is set to warn.
  - `--base <ref>`: Compare against a specific Git revision instead of upstream.
  - `--json`: Output machine-readable drift report.
- `testweave doctor`: Validate the contract, agent rules, and Git pre-push hook.
  - `--fix`: Automatically repair missing rules or hooks without losing contracts.
- `testweave generate`: Export manual tests for Jira, Xray, or Zephyr, or draft modules with AI.
  - `--target <jira|xray|zephyr>`: Target QA tracking system.
  - `--format <csv|json>`: Export format.
  - `--provider <openai|anthropic>`: AI module drafting.
- `testweave init` / `testweave setup`: Initialize contract, agent skills, and Git pre-push hook.
  - `-y, --yes`: Accept defaults non-interactively.
- `testweave update`: Update agent skills, IDE rules, and hooks to the latest definitions.
  - `-y, --yes`: Accept existing or detected integrations non-interactively.

## Development Workflow

1. **Read Contract**: Open `test-truth.md` or call `get_contract` to inspect existing test coverage for target files.
2. **Implement Changes**: Modify the source code.
3. **Update Test Contract**: Update or add test cases with clear actions, types, and expected outcomes matching the new behavior.
4. **Verify Alignment**: Run `testweave sync` (or call `check_drift`) to ensure zero drift.
5. **Commit Together**: Commit `test-truth.md` in the exact same commit as the source code changes.
