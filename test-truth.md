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
      "scripts/**/*.{ts,tsx,js,jsx,mjs,cjs}",
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
      "description": "CLI entrypoints, context, setup/init, sync, doctor, and generate commands",
      "paths": [
        "src/cli/**/*.ts",
        "src/index.ts"
      ],
      "tests": [
        {
          "id": "CLI-001",
          "title": "Interactive setup with agent selection and custom skill installation",
          "priority": "high",
          "preconditions": [
            "Node.js 20+ runtime available"
          ],
          "steps": [
            {
              "action": "Run testweave setup or testweave init with --yes or interactive selection",
              "data": "npx testweave setup",
              "expected": "Displays retro ASCII banner, status lines, agent selection, and installs rules & custom skill"
            }
          ],
          "tags": [
            "cli",
            "setup",
            "init"
          ]
        }
      ]
    },
    {
      "id": "integrations-agents",
      "name": "Integrations, Agents & Skills",
      "description": "Agent directory, custom skill management, IDE rule injection, and hook installation",
      "paths": [
        "src/integrations/**/*.ts",
        "tests/**/*.ts",
        "scripts/**/*.mjs"
      ],
      "tests": [
        {
          "id": "INT-001",
          "title": "Expanded agent catalog and custom skill verification",
          "priority": "high",
          "preconditions": [
            "TestWeave package built"
          ],
          "steps": [
            {
              "action": "Inspect 79 agents catalog and install custom skill to target directories",
              "data": "ALL_AGENTS, installSkill, hasSkill",
              "expected": "Validates 23 universal agents and 56 dedicated agents, installs SKILL.md cleanly"
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
          "priority": "high",
          "preconditions": [
            "Valid test-truth.md file"
          ],
          "steps": [
            {
              "action": "Execute MCP tools and contract validations",
              "data": "get_contract, upsert_test_module, check_drift",
              "expected": "Contracts are serialized, parsed, and drift is accurately calculated"
            }
          ],
          "tags": [
            "engine",
            "mcp"
          ]
        }
      ]
    }
  ]
}
~~~
