import path from 'node:path';
import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';

export const TESTWEAVE_SKILL_NAME = 'testweave';
export const TESTWEAVE_REFERENCE_NAME = 'reference.md';

export const TESTWEAVE_SKILL_CONTENT = `---
name: testweave
description: Keep manual QA contracts aligned with source changes through TestWeave CLI and MCP tools. Use when inspecting, adding, editing, or testing code to check test-truth.md, prevent QA drift, update test cases, and sync contracts.
---

# TestWeave QA Contract Skill

TestWeave keeps manual QA test contracts (\`test-truth.md\`) synchronized with source code modifications. Every change in system behavior must be matched by corresponding, updated test coverage in \`test-truth.md\`.

## Core Principles

1. **Evidence over assumptions**: Never claim a test was executed without actual evidence. This contract describes tests and acceptance criteria, not execution results.
2. **Read the contract first**: Inspect \`test-truth.md\` before altering source behavior.
3. **Path coverage**: Every modified source file must match at least one registered module's paths pattern.
4. **Synchronized updates**: When editing code, update that module's manual test actions and expected results in the same commit.
5. **Scenario diversity**: Include success, failure, and edge/boundary scenarios. Keep test IDs stable and globally unique.
6. **Zero drift before committing**: Run \`testweave sync\` before committing. Staged changes must pass without unmapped or stale module drift.
7. **Preserve policy**: Never bypass Git pre-push hooks or loosen warning policies to conceal QA drift.

## When to Use This Skill

- **Planning code changes**: Review which modules and test cases cover the files you will touch.
- **Adding new features**: Register new modules with comprehensive test plans and valid file paths.
- **Refactoring or fixing bugs**: Update existing manual test actions, expected results, or add regression test cases.
- **Pre-commit verification**: Run \`testweave sync\` to confirm zero QA drift.
- **System diagnostics**: Run \`testweave doctor\` to ensure configuration, agent rules, and hooks are intact.

## Test Categorization & Types

Test cases in \`test-truth.md\` support explicit functional testing types:
- \`unit\`: Unit testing for isolated logic, utilities, and components.
- \`integration\`: Integration testing for multi-component and service boundaries.
- \`system\`: System testing for complete end-to-end flows.
- \`sanity\`: Sanity testing for quick verification of targeted bug fixes.
- \`smoke\`: Smoke testing for fundamental build and readiness checks.
- \`regression\`: Regression testing to verify unchanged features remain functional.
- \`uat\`: User Acceptance Testing from the customer/operator perspective.
- \`ui\`: UI testing for interactive visual elements, CLI prompts, and layouts.
- \`api\`: API testing for MCP tool schemas, endpoints, and data contracts.
- \`interface\`: Interface testing between distinct subsystems (IDEs, Git hooks).
- \`component\`: Component testing for modular building blocks.
- \`e2e\`: End-to-end lifecycle verification.

For complete definitions, test design techniques (Boundary Value Analysis, Equivalence Partitioning), and authoring guidelines, see [reference.md](reference.md).

## Tools & Commands

### MCP Tools (when running in MCP-enabled agent)
- \`get_contract\`: Inspect the current QA contract, registered modules, paths, and test cases.
- \`upsert_test_module\`: Add or update a module in \`test-truth.md\` with stable test IDs, test types, actions, and expected results.
- \`check_drift\`: Verify whether working tree changes or diffs diverge from the QA contract.

### CLI Commands
- \`testweave sync\`: Check source changes against QA contract.
  - \`--strict\`: Block on drift even if policy is set to warn.
  - \`--base <ref>\`: Compare against a specific Git revision instead of upstream.
  - \`--json\`: Output machine-readable drift report.
- \`testweave doctor\`: Validate the contract, agent rules, and Git pre-push hook.
  - \`--fix\`: Automatically repair missing rules or hooks without losing contracts.
- \`testweave generate\`: Export manual tests for Jira, Xray, or Zephyr, or draft modules with AI.
  - \`--target <jira|xray|zephyr>\`: Target QA tracking system.
  - \`--format <csv|json>\`: Export format.
  - \`--provider <openai|anthropic>\`: AI module drafting.
- \`testweave init\` / \`testweave setup\`: Initialize contract, agent skills, and Git pre-push hook.
  - \`-y, --yes\`: Accept defaults non-interactively.
- \`testweave update\`: Update agent skills, IDE rules, and hooks to the latest definitions.
  - \`-y, --yes\`: Accept existing or detected integrations non-interactively.

## Development Workflow

1. **Read Contract**: Open \`test-truth.md\` or call \`get_contract\` to inspect existing test coverage for target files.
2. **Implement Changes**: Modify the source code.
3. **Update Test Contract**: Update or add test cases with clear actions, types, and expected outcomes matching the new behavior.
4. **Verify Alignment**: Run \`testweave sync\` (or call \`check_drift\`) to ensure zero drift.
5. **Commit Together**: Commit \`test-truth.md\` in the exact same commit as the source code changes.
`;

export const TESTWEAVE_REFERENCE_CONTENT = `# TestWeave QA Reference: Functional Testing & Living Test Contracts

This reference documents functional testing principles, taxonomies, test design techniques, and TestWeave contract schema specifications for manual and automated QA verification.

---

## 1. Overview of Functional Testing

**Functional Testing** is a software testing methodology that validates whether an application operates in strict compliance with its functional requirements and specifications.

- **Black-box perspective**: Tests evaluate the software from the outside by providing inputs and examining the resulting outputs and behaviors, without relying on internal code mechanics.
- **Specification-driven**: Acceptance criteria, preconditions, and observable expected outcomes form the authoritative benchmark of correctness.
- **Living contract in TestWeave**: \`test-truth.md\` serves as the repository's single source of truth for functional test specifications. When system behavior evolves, the QA contract must be updated simultaneously to eliminate QA drift.

---

## 2. Taxonomy of Test Types in TestWeave

TestWeave's schema (\`test-truth.ts\`) supports distinct test types for test cases:

| Type Key | Display Name | Level / Category | Primary Purpose |
|----------|--------------|------------------|-----------------|
| \`unit\` | Unit Testing | Component / Unit | Validates isolated functions, algorithms, and standalone units. |
| \`integration\` | Integration Testing | Subsystem | Verifies interfaces and data exchange between multiple modules or external services. |
| \`system\` | System Testing | System | Evaluates the completely integrated software against holistic requirements. |
| \`sanity\` | Sanity Testing | Build / Acceptance | Fast, targeted verification verifying that specific bug fixes or minor patches work without breaking dependent features. |
| \`smoke\` | Smoke Testing | Build Verification | Broad, shallow check verifying that core capabilities function and the build is stable enough for deeper testing. |
| \`regression\` | Regression Testing | Maintenance / Release | Ensures recent modifications, refactoring, or additions have not broken existing working features. |
| \`uat\` | User Acceptance Testing (UAT) | Acceptance | Validates end-to-end user journeys and operational scenarios against real customer expectations. |
| \`ui\` | UI Testing | Presentation | Verifies visual presentations, terminal UI prompts, banners, layouts, and error rendering. |
| \`api\` | API Testing | Interface / Service | Validates programmatic contracts, MCP tool payloads, CLI command line interfaces, and JSON schema boundaries. |
| \`interface\` | Interface Testing | Boundary | Verifies communication protocols and contracts between distinct software systems (e.g., IDEs, Git hooks). |
| \`component\` | Component Testing | Module | Validates cohesive modular building blocks before full system assembly. |
| \`e2e\` | End-to-End Testing | Flow | Validates entire lifecycles from fresh initialization to commit and push verification. |

### Test Type Breakdown & Examples

#### 1. Unit Testing (\`unit\`)
- **Focus**: Fine-grained logic, mathematical routines, path sanitizers, and parsing routines.
- **When to Use**: Whenever writing pure functions or isolated modules where edge cases can be exercised in isolation.
- **Example**:
  \`\`\`json
  {
    "id": "UNIT-001",
    "title": "POSIX glob path validator rejects path traversal and absolute paths",
    "type": "unit",
    "priority": "critical",
    "preconditions": ["sourcePatternSchema validator imported"],
    "steps": [
      {
        "action": "Validate forbidden patterns such as ../secret, /etc/passwd, and C:\\\\file",
        "data": "['../secret', '/etc/passwd', 'C:/file', 'src\\\\file']",
        "expected": "Validator rejects all traversed or non-POSIX paths with descriptive schema errors"
      }
    ],
    "tags": ["unit", "schema", "security"]
  }
  \`\`\`

#### 2. Integration Testing (\`integration\`)
- **Focus**: Interaction points between subsystems (e.g., Markdown parser + Contract Store, CLI + Git subsystem).
- **When to Use**: When validating data flow across module boundaries.
- **Example**:
  \`\`\`json
  {
    "id": "INT-001",
    "title": "Contract store updates disk and preserves outside markdown prose",
    "type": "integration",
    "priority": "high",
    "preconditions": ["Initialized test-truth.md with team notes"],
    "steps": [
      {
        "action": "Upsert modified test module via MarkdownContractStore",
        "data": "store.upsert(updatedModule)",
        "expected": "Authoritative JSON block is updated while surrounding notes and markdown headers remain intact"
      }
    ],
    "tags": ["integration", "store", "markdown"]
  }
  \`\`\`

#### 3. System Testing (\`system\`)
- **Focus**: Complete, packaged application behavior in real target environments.
- **When to Use**: Verifying end-to-end flows with real package managers, tarballs, or CLI installations.
- **Example**:
  \`\`\`json
  {
    "id": "SYS-001",
    "title": "Cross-package-manager verification on fresh workspace",
    "type": "system",
    "priority": "high",
    "preconditions": ["Built npm tarball package available"],
    "steps": [
      {
        "action": "Execute testweave setup, sync, and doctor using npm, pnpm, yarn, and bun",
        "data": "npm run check:manager -- <manager>",
        "expected": "CLI installs cleanly, executes matching release version, and completes doctor checks"
      }
    ],
    "tags": ["system", "ci", "package-managers"]
  }
  \`\`\`

#### 4. Sanity Testing (\`sanity\`)
- **Focus**: High-speed, focused check following a patch or bug fix to verify the defect is resolved.
- **When to Use**: After committing a specific fix or hotfix before running full regression suites.
- **Example**:
  \`\`\`json
  {
    "id": "SAN-001",
    "title": "Verify fix for CSV formula injection on export command",
    "type": "sanity",
    "priority": "critical",
    "preconditions": ["TestWeave CLI available with exporter fix"],
    "steps": [
      {
        "action": "Export contract containing cells starting with =, +, -, @ to CSV",
        "data": "testweave generate --target xray --format csv",
        "expected": "Formula characters are safely prefixed with single quotes in CSV output"
      }
    ],
    "tags": ["sanity", "security", "export"]
  }
  \`\`\`

#### 5. Smoke Testing (\`smoke\`)
- **Focus**: Basic sanity and operational viability of a new build or fresh install.
- **When to Use**: Immediately after building or packaging, prior to running detailed test suites.
- **Example**:
  \`\`\`json
  {
    "id": "SMK-001",
    "title": "CLI basic startup, help display, and version flag",
    "type": "smoke",
    "priority": "critical",
    "preconditions": ["Node.js runtime installed"],
    "steps": [
      {
        "action": "Run testweave --help and testweave --version",
        "data": "testweave --version",
        "expected": "Prints current semantic version and exits with status 0"
      }
    ],
    "tags": ["smoke", "cli"]
  }
  \`\`\`

#### 6. Regression Testing (\`regression\`)
- **Focus**: Ensuring modifications do not introduce unintended side effects in existing features.
- **When to Use**: Regular CI builds, pull request validations, and pre-release audits.
- **Example**:
  \`\`\`json
  {
    "id": "REG-001",
    "title": "Multi-version update command maintains agent rule integrity",
    "type": "regression",
    "priority": "high",
    "preconditions": ["Workspace initialized with prior version rules and hooks"],
    "steps": [
      {
        "action": "Run testweave update --yes across release transitions",
        "data": "npx testweave update --yes",
        "expected": "Updates skills and rules without modifying user custom rules outside TestWeave markers"
      }
    ],
    "tags": ["regression", "update", "ide"]
  }
  \`\`\`

#### 7. User Acceptance Testing (\`uat\`)
- **Focus**: Practical usability, onboarding flow, and developer experience.
- **When to Use**: Validating interactive wizards and setup onboarding flows.
- **Example**:
  \`\`\`json
  {
    "id": "UAT-001",
    "title": "Interactive terminal setup flow with fuzzy agent selection",
    "type": "uat",
    "priority": "high",
    "preconditions": ["Terminal session in empty repository"],
    "steps": [
      {
        "action": "Run interactive testweave setup, search for cursor and claude, and confirm",
        "data": "npx testweave setup",
        "expected": "Renders clear ASCII banner, prompts for agent selection, confirms file injection, and provides next steps"
      }
    ],
    "tags": ["uat", "dx", "interactive"]
  }
  \`\`\`

#### 8. UI Testing (\`ui\`)
- **Focus**: Visual terminal formatting, layout alignment, ANSI colors, spinner animations, and error highlights.
- **When to Use**: Testing interactive CLI components, banners, and terminal feedback.
- **Example**:
  \`\`\`json
  {
    "id": "UI-001",
    "title": "Retro ASCII banner and agent summary formatting",
    "type": "ui",
    "priority": "medium",
    "preconditions": ["Standard terminal stdout"],
    "steps": [
      {
        "action": "Trigger banner rendering in setup overview",
        "data": "printSetupOverview()",
        "expected": "Correct color gradients, aligned divider columns, and clear universal/dedicated categorization"
      }
    ],
    "tags": ["ui", "terminal", "banner"]
  }
  \`\`\`

#### 9. API Testing (\`api\`)
- **Focus**: MCP (Model Context Protocol) tool signatures, inputs, and outputs over stdio.
- **When to Use**: Validating agent tool calling interfaces and schema enforcement.
- **Example**:
  \`\`\`json
  {
    "id": "API-001",
    "title": "MCP stdio tool interface and living-test-contract resource",
    "type": "api",
    "priority": "critical",
    "preconditions": ["MCP server running via stdio transport"],
    "steps": [
      {
        "action": "Send initialize request, list resources, and call upsert_test_module",
        "data": "tools/call: upsert_test_module",
        "expected": "Returns validated tool result with updated module count and resource URI"
      }
    ],
    "tags": ["api", "mcp", "stdio"]
  }
  \`\`\`

#### 10. Interface Testing (\`interface\`)
- **Focus**: Boundary contracts with external systems (e.g. IDE config files, Git hooks, CI workflows).
- **When to Use**: Testing IDE rule marker injection and Git pre-push hook execution.
- **Example**:
  \`\`\`json
  {
    "id": "ITF-001",
    "title": "Pre-push hook blocks push when contract has drift",
    "type": "interface",
    "priority": "critical",
    "preconditions": ["Git repository with pre-push hook installed and policy mode block"],
    "steps": [
      {
        "action": "Modify source code without updating test-truth.md and run git push",
        "data": "git push origin main",
        "expected": "Hook exits with non-zero code, displays drift details, and prevents remote push"
      }
    ],
    "tags": ["interface", "git", "hook"]
  }
  \`\`\`

---

## 3. Functional Testing Design Techniques

Functional test case design relies on proven techniques to maximize test coverage while avoiding redundant test steps:

### A. Equivalence Class Partitioning (ECP)
- **Concept**: Divides the input domain of a program into partitions of equivalent data from which test cases can be derived.
- **Application**:
  - *Valid partition*: Positively matched workspace globs (\`src/**/*.ts\`).
  - *Invalid partitions*: Leading slashes (\`/etc/passwd\`), backslashes on Windows (\`src\\\\file\`), parent traversal (\`../outside\`).

### B. Boundary Value Analysis (BVA)
- **Concept**: Focuses on boundary conditions where software defects cluster (minimum, minimum + 1, nominal, maximum - 1, maximum).
- **Application**:
  - Module / test title lengths: Min length (1 char), Max length (20,000 chars).
  - Array sizes: Empty (\`[]\`), 1 element, 500 steps, 1,000 tests.

### C. Decision Table Testing
- **Concept**: Maps combinations of input conditions to resulting actions in a tabular matrix.
- **Application**:
  | Condition: Policy Mode | Condition: Working Tree | Action: testweave sync exit | Action: Report |
  |------------------------|-------------------------|-----------------------------|----------------|
  | \`block\` | Clean / Synced | Exit 0 | Synced |
  | \`block\` | Drifted | Exit 1 | Blocked |
  | \`warn\` | Drifted | Exit 0 | Warning logged |
  | \`warn\` (\`--strict\`) | Drifted | Exit 1 | Blocked |

### D. State Transition Testing
- **Concept**: Tests the system across lifecycle states and validates valid and invalid transitions.
- **Application**:
  - States: Uninitialized $\\rightarrow$ Initialized $\\rightarrow$ Source Modified (Drifted) $\\rightarrow$ Contract Updated $\\rightarrow$ Synced & Verified.

### E. Error Guessing
- **Concept**: Anticipates common programmer and environmental mistakes based on past defect history.
- **Application**:
  - Symlink escapes outside workspace boundary.
  - Formula injection via CSV export fields.
  - Race conditions with lock files during concurrent writes.

---

## 4. TestWeave QA Contract Lifecycle

1. **Analyze Requirements**: Understand what source code is changing and the intended user-facing or technical behavior.
2. **Review Contract**: Call \`get_contract\` or read \`test-truth.md\` to identify existing modules and tests covering the modified files.
3. **Design Scenarios**: Apply BVA and ECP to define concrete preconditions, test steps (action, data, expected outcome), and test types.
4. **Implement & Update**: Modify source code and immediately update the module in \`test-truth.md\` via \`upsert_test_module\` or direct edit.
5. **Verify Drift**: Run \`testweave sync\` (or MCP \`check_drift\`) to ensure zero drift before committing.
6. **Commit Atomically**: Commit both the source changes and the updated \`test-truth.md\` in the exact same Git commit.

---

## 5. Functional vs. Non-Functional Testing

| Parameter | Functional Testing | Non-Functional Testing |
|-----------|--------------------|------------------------|
| **Focus** | Validates *what* the system does against functional specifications. | Validates *how well* the system performs (speed, scalability, security). |
| **Criteria** | Business requirements, user actions, expected output. | Performance, concurrency, reliability, throughput. |
| **Execution** | Manual QA test contracts (\`test-truth.md\`), integration tests, unit tests. | Load tests, stress tests, benchmark suites. |
| **TestWeave Role** | Primary authoritative contract defining acceptance criteria. | Complementary metrics referenced via tags or notes. |

---

## 6. Official References

- **GeeksforGeeks Functional Testing Guide**: [Functional Testing - Software Testing](https://www.geeksforgeeks.org/software-testing/software-testing-functional-testing/)
- **TestWeave Repository**: Living Manual QA Contract specification engine and drift detector.
`;

export async function installSkill(root: string, skillsDir: string): Promise<string> {
  const relativeFile = path.join(skillsDir, TESTWEAVE_SKILL_NAME, 'SKILL.md');
  const file = await workspacePath(root, relativeFile);
  await atomicWrite(file, TESTWEAVE_SKILL_CONTENT);

  const relativeReference = path.join(skillsDir, TESTWEAVE_SKILL_NAME, TESTWEAVE_REFERENCE_NAME);
  const referenceFile = await workspacePath(root, relativeReference);
  await atomicWrite(referenceFile, TESTWEAVE_REFERENCE_CONTENT);

  return file;
}

export async function hasSkill(root: string, skillsDir: string): Promise<boolean> {
  try {
    const relativeFile = path.join(skillsDir, TESTWEAVE_SKILL_NAME, 'SKILL.md');
    const file = await workspacePath(root, relativeFile);
    const content = await readOptional(file);
    const hasSkillFile = content !== undefined && content.includes('name: testweave') && content.includes('TestWeave QA Contract Skill');
    if (!hasSkillFile) return false;

    const relativeReference = path.join(skillsDir, TESTWEAVE_SKILL_NAME, TESTWEAVE_REFERENCE_NAME);
    const referenceFile = await workspacePath(root, relativeReference);
    const referenceContent = await readOptional(referenceFile);
    return referenceContent !== undefined && referenceContent.includes('TestWeave QA Reference') && referenceContent.includes('Functional Testing');
  } catch {
    return false;
  }
}

