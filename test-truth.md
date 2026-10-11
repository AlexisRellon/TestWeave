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
              "expected": "Validates 23 universal agents and 56 dedicated agents, installs and refreshes SKILL.md cleanly"
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
          "preconditions": ["Project with selected verified MCP integrations listed in docs/mcp-providers.md"],
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
              "expected": "Outputs absolute runtime and CLI paths with project --cwd, Codex reads the registered entry, and its launch responds with three tools and the living contract resource; unsupported output formats fail"
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
          "tags": ["mcp", "setup", "repair", "preservation"]
        },
        {
          "id": "INT-004",
          "title": "Shell, global npm and Homebrew installations share project setup",
          "type": "system",
          "priority": "high",
          "preconditions": ["Node.js 20+ with npm, or Homebrew for the brew method"],
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
          "tags": ["install", "shell", "npm-global", "homebrew"]
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
        }
      ]
    }

  ]
}
~~~
