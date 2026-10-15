# TestWeave Living Test Contract

The JSON block below is authoritative. Update affected modules and test steps with source changes.

~~~json testweave
{
  "schemaVersion": 1,
  "project": "TestWeave",
  "policy": {
    "mode": "block",
    "sourceGlobs": [
      "src/**/*.{ts,tsx,js,jsx}",
      "scripts/**/*.{ts,tsx,js,jsx,mjs,cjs,sh}",
      "Formula/**/*.rb",
      "tests/**/*.{ts,tsx,js,jsx}"
    ],
    "ignoreGlobs": [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.d.ts"
    ]
  },
  "modules": [
    {
      "id": "cli-core",
      "name": "CLI Core & Commands",
      "description": "CLI entrypoints, context, setup/init, update, sync, doctor, and generate commands",
      "paths": [
        "src/cli/**/*.ts",
        "src/index.ts"
      ],
      "tests": [
        {
          "id": "CLI-004",
          "title": "Doctor presents aligned diagnostics, relevant paths and an accurate check summary",
          "type": "ui",
          "priority": "high",
          "preconditions": [
            "An initialized workspace or a workspace with failed diagnostics"
          ],
          "steps": [
            {
              "action": "Run doctor on healthy, damaged and repaired workspaces; compare doctor --json and disable terminal colors",
              "data": "testweave doctor; testweave doctor --fix; testweave doctor --json; NO_COLOR=1",
              "expected": "Human output shows a diagnostics heading, aligned named OK/FAIL checks with relevant contract, integration and hook paths, installation version/runtime/workspace/bundle details, disabled-hook information and a passed/total summary. Healthy checks show Everything looks good; failures distinguish automatic from manual repairs. Summary counts diagnostic checks only. JSON remains the existing diagnostic array without presentation metadata, colors or summary text; exit codes remain 0 for healthy and 1 for unresolved checks. --fix reports final repaired results while preserving authored contracts."
            }
          ],
          "tags": [
            "doctor",
            "cli",
            "formatting",
            "json",
            "regression"
          ]
        },
        {
          "id": "CLI-003",
          "title": "Adopt an existing project through context-first scan preview and apply",
          "type": "e2e",
          "priority": "high",
          "preconditions": [
            "An existing project with source, project context and automated tests; TestWeave installed"
          ],
          "steps": [
            {
              "action": "Run scan and scan --json, optionally prioritizing docs/product.md using --context; then run scan --apply twice",
              "data": "testweave scan; testweave scan --context docs/product.md --json; testweave scan --apply",
              "expected": "Preview reads available context before implementation files and inventories function/route/test evidence and journey candidates without writing. Apply adds validated needs-review drafts for uncovered tracked files. Repeating the scan adds nothing; authored modules, IDs, policy and surrounding prose remain unchanged."
            },
            {
              "action": "Scan a fresh, empty, partially covered or malformed workspace; select missing or outside context",
              "data": "Empty modules; existing coverage; invalid test-truth.md; --context missing.md; --context ../private.md",
              "expected": "Fresh projects can acquire a contract through apply; empty scans do not write. Existing coverage is preserved. Invalid contracts and invalid selected context fail before adoption. Drafts require specific acceptance criteria and never claim test execution."
            }
          ],
          "tags": [
            "scan",
            "adoption",
            "context",
            "preservation"
          ]
        },
        {
          "id": "CLI-001",
          "title": "Interactive setup with agent selection and custom skill installation",
          "type": "smoke",
          "priority": "high",
          "preconditions": [
            "Node.js 20+ runtime available"
          ],
          "steps": [
            {
              "action": "Run testweave setup or testweave init with --yes or interactive selection on the current release",
              "data": "npx testweave setup",
              "expected": "Displays retro ASCII banner, status lines and agent selection, including universal agents with verified native MCP registrations; detects existing supported client configuration directories and files; installs rules, skills and project MCP entries for selected verified providers and reports configured files; mcp install --provider registers a single client, custom JSONC paths and keys remain supported, and mcp config exports provider-native JSON or TOML without starting the server"
            }
          ],
          "tags": [
            "cli",
            "setup",
            "init"
          ]
        },
        {
          "id": "CLI-002",
          "title": "Update command refreshes agent skills, IDE rules, and hooks",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "TestWeave workspace initialized or fresh"
          ],
          "steps": [
            {
              "action": "Run testweave update with --yes or interactive selection across version releases",
              "data": "npx testweave update --yes",
              "expected": "Refreshes custom skills, IDE rules and MCP launch paths while preserving other servers and comments; updates hooks and reports updated contract status for current version"
            }
          ],
          "tags": [
            "cli",
            "update"
          ]
        },
        {
          "id": "CLI-005",
          "title": "Preview impact and resolve drift interactively",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Preview existing globs and a not-yet-created path",
              "data": "testweave impact 'src/auth/**' src/auth/new.ts --json",
              "expected": "Only mapped modules, linked spec sections, test IDs/titles and preconditions are returned; no source or contract changes occur. Unknown paths return no matches and escaping paths fail."
            },
            {
              "action": "Run interactive sync and choose mapping, local scanning, cancellation and AI drafting",
              "data": "testweave sync --base HEAD --interactive; optional explicit --provider and --model",
              "expected": "TTY prompts preview each change and require acceptance. Mapping preserves tests; scan creates needs-review scenarios from local evidence. AI shows scoped context before sending. Concurrent changes reject stale writes. Drift is checked again; drafts claim no execution."
            },
            {
              "action": "Attempt interactive mode in automation or pre-push",
              "data": "--interactive --json; --interactive --pre-push; non-TTY stdin",
              "expected": "Command rejects incompatible modes before mutation. Provider options require interactive mode and AI drafting requires an explicit provider/model."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        },
        {
          "id": "CLI-006",
          "title": "Generate scoped drafts with local and hosted providers",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Request a compact draft using a module or document heading",
              "data": "generate --provider ollama --model local-model --module authentication --compact; custom --base-url; gemini",
              "expected": "Only selected module context, linked heading slices and uncommitted hunks are sent; output validates and does not change the contract. Ollama requires no key, custom requires a base URL, Gemini requires GEMINI_API_KEY."
            },
            {
              "action": "Provide a missing anchor, invalid endpoint, incomplete response or duplicate IDs",
              "data": "missing.md#heading; file:///endpoint; truncated provider response",
              "expected": "Invalid context and configuration fail clearly; malformed, incomplete or identity-changing drafts are rejected before output/adoption. Existing output files are never overwritten."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        }
      ]
    },
    {
      "id": "integrations-agents",
      "name": "Integrations, Agents & Skills",
      "description": "Agent directory, custom skills, IDE rules, project MCP registration, shell and Homebrew installation, and Git hooks",
      "paths": [
        "src/integrations/**/*.ts",
        "tests/**/*.ts",
        "scripts/**/*.{mjs,sh}",
        "Formula/**/*.rb"
      ],
      "tests": [
        {
          "id": "INT-005",
          "title": "Installed agent rules and skills prioritize project context during adoption",
          "type": "integration",
          "priority": "high",
          "preconditions": [
            "Built TestWeave package"
          ],
          "steps": [
            {
              "action": "Install or refresh TestWeave rules and skills, and read the shipped SKILL.md",
              "data": "testweave setup --yes; testweave update --yes; skills/testweave/SKILL.md",
              "expected": "The shared SKILL.md entrypoint prioritizes project context and routes agents to focused command and reference documents. Scan guidance describes preview, custom context, JSON and additive apply, with needs-review drafts and no execution claims. Setup installs all routed documents and directs existing projects to scan. Doctor detects missing or stale nested skill documents even when client IDE rules are intact; doctor --fix restores them without changing authored contracts or user files."
            }
          ],
          "tags": [
            "skills",
            "rules",
            "context",
            "scan"
          ]
        },
        {
          "id": "INT-001",
          "title": "Expanded agent catalog and custom skill verification",
          "type": "integration",
          "priority": "high",
          "preconditions": [
            "TestWeave package built"
          ],
          "steps": [
            {
              "action": "Inspect 79 agents catalog and install or update custom skill across targets",
              "data": "ALL_AGENTS, installSkill, hasSkill, testweave update",
              "expected": "Validates 23 universal agents and 56 dedicated agents. Installs and refreshes the complete authoritative skills/testweave bundle: SKILL.md, commands/*.md and references/*.md, with working relative links and no duplicate documentation strings in the installer. Missing or changed managed files fail skill diagnostics; refresh preserves unrelated user files. The generated implementation bundle includes all authoritative skill Markdown alongside source, so its runtime resources remain available. A nested resource directory linked outside the workspace is rejected before bundle writes."
            }
          ],
          "tags": [
            "agents",
            "skills"
          ]
        },
        {
          "id": "INT-002",
          "title": "Cross-package-manager verification under dynamic versions",
          "type": "system",
          "priority": "high",
          "preconditions": [
            "TestWeave package built into tarball"
          ],
          "steps": [
            {
              "action": "Run check:manager script across npm, pnpm, yarn, and bun",
              "data": "npm run check:manager -- <manager>",
              "expected": "Installs tarball, executes CLI matching current version, validates doctor and MCP stdio"
            }
          ],
          "tags": [
            "package-managers",
            "ci"
          ]
        },
        {
          "id": "INT-003",
          "title": "Built-in and custom MCP configuration preserves settings and supports repair",
          "type": "integration",
          "priority": "high",
          "preconditions": [
            "Project with selected verified MCP integrations listed in docs/mcp-providers.md"
          ],
          "steps": [
            {
              "action": "Run setup twice with existing servers, comments and trailing commas, then connect using the generated entry",
              "data": "JSONC server maps, OpenCode/Kilo/Posit command arrays, Codex/Grok TOML tables and Mistral Vibe TOML array tables; testweave setup --yes",
              "expected": "One testweave entry uses absolute runtime and CLI paths with project --cwd; other settings and comments survive, repeated setup is idempotent, and MCP tools and resources respond"
            },
            {
              "action": "Replace a launch command with an obsolete path, run update, delete an entry, then run doctor --fix",
              "data": "testweave update --yes; testweave doctor --fix",
              "expected": "Update refreshes the launch command and doctor restores missing MCP entries without changing other servers"
            },
            {
              "action": "Attempt installation with malformed JSON, a non-object server map, or a configuration directory linked outside the workspace",
              "data": "Invalid JSON, null, array maps, symlink or junction",
              "expected": "Installation fails with an actionable error and preserves configuration and outside files; malformed JSON requires manual repair"
            },
            {
              "action": "Select only universal skills during setup",
              "data": "integrations: universal",
              "expected": "Skills install without creating MCP configurations for unselected clients"
            },
            {
              "action": "Inject into a custom client JSONC file twice using a custom server-map key; attempt an invalid map, reserved key and path outside the workspace",
              "data": "testweave mcp install --config .custom/mcp.json --key customServers",
              "expected": "Preserves comments and other servers, writes one idempotent testweave entry, and rejects invalid maps, reserved keys and outside paths without overwriting them"
            },
            {
              "action": "Export generic JSON and Codex TOML launch entries; register in Codex and connect using the configured launch",
              "data": "testweave mcp config; testweave mcp config --format toml; codex mcp add testweave -- <command> <args>; codex mcp get testweave",
              "expected": "Outputs absolute runtime and CLI paths with project --cwd, Codex reads the registered entry, and its launch responds with ten tools and the living contract resource; unsupported output formats fail"
            },
            {
              "action": "Install and export with --provider for JSON, command-array and TOML clients; repeat installation and run doctor repair after removing entries",
              "data": "testweave mcp install --provider codex; --provider opencode; --provider mistral-vibe; testweave mcp config --provider amp; testweave doctor --fix",
              "expected": "Uses verified project paths and native schemas, preserves other servers and comments, keeps one idempotent TestWeave entry and repairs missing registrations; clients sharing .mcp.json remain healthy together; unsupported providers and conflicting provider/custom options fail before writing"
            },
            {
              "action": "Use existing opencode.jsonc and root kilo.json settings; provide malformed or duplicate TOML and inline TestWeave tables",
              "data": "opencode.jsonc; kilo.json; .codex/config.toml; .grok/config.toml; .vibe/config.toml",
              "expected": "Updates existing JSONC alternatives instead of creating competing configuration; TOML preserves unrelated settings, quoted table names, multiline values and comments; malformed TOML, wrong map/array shapes, duplicate TestWeave array entries and unsupported inline declarations fail without changing files; universal skills alone do not register individual MCP clients"
            }
          ],
          "tags": [
            "mcp",
            "setup",
            "repair",
            "preservation"
          ]
        },
        {
          "id": "INT-004",
          "title": "Shell, global npm and Homebrew installations share project setup",
          "type": "system",
          "priority": "high",
          "preconditions": [
            "Node.js 20+ with npm, or Homebrew for the brew method"
          ],
          "steps": [
            {
              "action": "Install with the shell installer using npm and brew, selecting a project path containing spaces",
              "data": "sh scripts/install.sh --cwd '/project with spaces'; --method brew; --formula owner/tap/testweave for an existing tap",
              "expected": "The selected package manager installs TestWeave, then the installed CLI runs setup --yes with the correct project path and injects MCP configuration"
            },
            {
              "action": "Install globally with npm or the Homebrew HEAD formula, then run testweave setup --yes in a project",
              "data": "npm install --global testweave; brew tap alexisrellon/testweave https://github.com/AlexisRellon/TestWeave; brew install --HEAD alexisrellon/testweave/testweave",
              "expected": "Both installation methods use the same project MCP registration; Homebrew does not write project configuration during formula installation"
            },
            {
              "action": "Use --no-setup, invalid arguments, a missing project, or a failing package manager",
              "data": "--no-setup; --method unsupported; --cwd nonexistent",
              "expected": "Install-only mode skips project mutation; invalid arguments and missing paths fail before installation; installation failures prevent setup"
            }
          ],
          "tags": [
            "install",
            "shell",
            "npm-global",
            "homebrew"
          ]
        },
        {
          "id": "INT-006",
          "title": "Compact skill routing and expanded MCP installation remain usable",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Refresh a disposable agent installation and follow its focused guide links",
              "data": "testweave update --yes; SKILL.md; commands/index.md",
              "expected": "Compact skill/rule entrypoints direct agents to scoped context and case-level edits; all 11 bundled Markdown documents install and local links resolve. User prose and unrelated files remain intact."
            },
            {
              "action": "Connect through an installed MCP entry with compact mode enabled",
              "data": "mcp --compact; listTools; get_contract_index",
              "expected": "Ten tools and the Markdown resource are available. JSON responses omit only restorable defaults; errors remain readable and stdio contains only protocol messages."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        }
      ]
    },
    {
      "id": "engine-schema-llm-mcp",
      "name": "Engine, Schema, LLM & MCP",
      "description": "Core test contract store, drift detector, markdown parser, LLM adapters, and MCP server",
      "paths": [
        "src/engine/**/*.ts",
        "src/schema/**/*.ts",
        "src/llm/**/*.ts",
        "src/mcp/**/*.ts"
      ],
      "tests": [
        {
          "id": "ENG-003",
          "title": "Local discovery and atomic adoption preserve evidence, coverage and concurrent changes",
          "type": "integration",
          "priority": "high",
          "preconditions": [
            "Git and non-Git project fixtures with source, documentation and tests"
          ],
          "steps": [
            {
              "action": "Discover functions, routes including [id] paths, documented journeys and automated suites; include ignored, deleted, linked, binary and oversized files",
              "data": "scanProject; standard Git ignores; dependency/build folders; files over 256 KB; more than 10,000 files",
              "expected": "Context is prioritized and source evidence remains traceable. Literal path globs cover bracketed route files. Git ignores suppress untracked ignored files; standard dependency/output directories are excluded. Linked, binary, missing and oversized candidates are skipped or invalid explicit context rejected. Over-limit scans fail clearly."
            },
            {
              "action": "Append all discovered modules with the scanned contract snapshot, including a stale snapshot and duplicate IDs",
              "data": "MarkdownContractStore.append; concurrent contract update; existing lock",
              "expected": "All drafts validate and append in one locked write preserving prose and policy. Stale snapshots, duplicate IDs and locks fail without overwriting authored scenarios or partially appending modules. Existing upsert behavior remains unchanged."
            }
          ],
          "tags": [
            "engine",
            "scan",
            "atomic",
            "regression"
          ]
        },
        {
          "id": "ENG-001",
          "title": "QA contract storage and MCP operations",
          "type": "api",
          "priority": "high",
          "preconditions": [
            "Valid test-truth.md file"
          ],
          "steps": [
            {
              "action": "Execute MCP tools, contract validations, and server lifecycle matching release version",
              "data": "get_contract, upsert_test_module, check_drift, McpServer current release",
              "expected": "Contracts are serialized, parsed, server version matches package, and drift is accurately calculated"
            }
          ],
          "tags": [
            "engine",
            "mcp"
          ]
        },
        {
          "id": "ENG-002",
          "title": "Detailed test types and functional testing reference taxonomy validation",
          "type": "unit",
          "priority": "high",
          "preconditions": [
            "testTruthSchema and testCaseSchema imported"
          ],
          "steps": [
            {
              "action": "Validate test cases across unit, integration, system, sanity, smoke, regression, uat, ui, api, and interface types",
              "data": "TEST_TYPES, testTypeSchema, TEST_TYPE_LABELS, synonyms normalization",
              "expected": "Parses all standard functional test types, normalizes synonyms, and maps testType alias"
            }
          ],
          "tags": [
            "schema",
            "functional-testing",
            "taxonomy"
          ]
        },
        {
          "id": "ENG-004",
          "title": "Scoped contract and spec reads preserve context boundaries",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Read the index, modules for edited paths and anchored specs",
              "data": "get_contract_index; get_modules_for_files; get_module_by_path; get_spec_slice",
              "expected": "Index omits steps, matched reads exclude unrelated modules, headings include child sections and distinguish duplicates. Code-fenced headings are ignored. Uncommitted diffs contain relevant hunks and existing test headers."
            },
            {
              "action": "Request a missing heading, traversal path or out-of-workspace link",
              "data": "docs/spec.md#missing; ../private.md; external symlink",
              "expected": "Reads fail clearly without exposing outside content; no contract write occurs. Non-Git workspaces still support spec slices and impact."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        },
        {
          "id": "ENG-005",
          "title": "Atomic case edits and compact schema defaults",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Upsert one existing/new case and remove an absent/present case",
              "data": "upsert_test_case(moduleId,testCase); remove_test_case(moduleId,testId)",
              "expected": "Only the named case changes. Full-contract validation and test-truth.md.lock protect globally unique IDs, sibling tests and surrounding Markdown. Removing an absent case is idempotent."
            },
            {
              "action": "Attempt final-case deletion, duplicate IDs, unknown module and an existing lock",
              "data": "Last test; duplicate ID across modules; missing module; test-truth.md.lock",
              "expected": "All invalid changes fail without partial writes. Empty tags/preconditions and regression types restore after compact serialization. Optional docs/specs/refs retain schemaVersion 1 compatibility."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        },
        {
          "id": "ENG-006",
          "title": "Semantic and spec drift retain behavior-relevant changes",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Compare formatting, comments, local renames, exported signatures, routes and runtime expressions",
              "data": "sync --base HEAD --semantic",
              "expected": "Cosmetic JS/TS edits do not trigger stale-module; changed file inventory remains complete. Public signature, route, props and runtime changes retain drift. Unsupported languages, invalid syntax, added/deleted files and reflective code are conservative."
            },
            {
              "action": "Edit a linked heading, an unrelated heading, or delete a spec anchor",
              "data": "docs/spec.md#login; policy.docDriftMode warn/block/ignore",
              "expected": "Only affected linked sections trigger stale-spec without a test update. Default warning does not block; block/strict enforce. Current policy cannot weaken baseline enforcement. Doctor identifies dead specs without deleting authored definitions."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        },
        {
          "id": "ENG-007",
          "title": "Pre-push refactor bypasses are module-scoped and auditable",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Push a range where every source-changing commit has a justified module marker",
              "data": "Testweave-Bypass: authentication (pure internal refactor); @testweave-skip authentication (reason)",
              "expected": "Only stale-module for that module clears. Reports retain commit SHA, module ID and reason. Contract bytes remain unchanged; dirty working definitions cannot change the committed verdict."
            },
            {
              "action": "Omit a reason or marker on one affected commit, use another module, or leave spec/unmapped drift",
              "data": "Multiple commits; empty reason; unrelated marker; first-push empty baseline",
              "expected": "Drift remains. Ordinary sync ignores markers; first pushes from an empty-tree baseline do not use bypasses."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        },
        {
          "id": "ENG-008",
          "title": "Doctor distinguishes dead paths and orphaned modules",
          "type": "regression",
          "priority": "high",
          "preconditions": [
            "A disposable initialized Git workspace with a committed QA contract and a known baseline revision."
          ],
          "steps": [
            {
              "action": "Delete matching source files and linked documents or headings, then diagnose",
              "data": "doctor --json; doctor --fix",
              "expected": "Each zero-match path is identified; modules with no live paths are orphaned. Missing spec files and anchors are reported. These findings require manual review; --fix preserves contract definitions."
            }
          ],
          "tags": [
            "v0.7.0",
            "regression"
          ]
        }
      ]
    }
  ]
}
~~~
