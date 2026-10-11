# MCP provider registration

Checked against public provider documentation on 2026-10-11. This guide covers all 79 entries in the skill catalog. MCP is registered in the agent client, independently of its underlying model provider.

26 clients have verified automatic project registration. Select them in setup/init/update or install one directly:

```sh
testweave mcp install --provider codex
testweave mcp install --provider gemini-cli
testweave mcp install --provider opencode
testweave mcp config --provider mistral-vibe
```

Automatic entries use the installed runtime and CLI with absolute paths and project `--cwd`. The installer preserves unrelated servers and comments, is idempotent, and rejects malformed configuration before writing. Update refreshes launch paths; doctor repairs missing/outdated registrations for selected clients. Registering a file does not replace provider trust, approval, or policy checks. Client applications were not all installed or exercised; automated tests verify config merging, format, repair, and the TestWeave stdio handshake.

The universal skill directory is not a universal MCP config. Universal agents with verified MCP support are individually selectable. Selecting only `universal` installs skills without creating provider MCP configs. `claude` remains an alias for `claude-code`.

Existing `opencode.jsonc` is preferred over creating `opencode.json`. Existing root `kilo.jsonc`/`kilo.json` is preferred over the default `.kilo/kilo.jsonc`. The Kilo adapter targets the current `mcp` command-array schema, not legacy `.kilocode/mcp.json`. The OpenCode adapter uses the schema documented at the stable MCP guide; a separate OpenCode v2 `mcp.servers` schema needs its own adapter.

Codex/Grok edits require a dedicated `[mcp_servers.testweave]` table when TestWeave already exists. Inline/dotted declarations fail with a conversion instruction, preserving the file. Mistral Vibe uses a dedicated `[[mcp_servers]]` entry named `testweave`; duplicate TestWeave names are rejected. TOML edits use parser ranges rather than rewriting the whole document, preserving unrelated settings and comments around updated values. Comments inside a replaced command/args value can be replaced along with that value.

For manual clients, export `testweave mcp config` and merge the server into the client configuration described by its source. The export is stdio configuration, not an HTTP URL. No global client settings are written by setup. For a custom workspace JSON map, use `testweave mcp install --config <file> --key <map>`. A verified provider cannot be combined with custom path/key options; provider exports must use the provider's native format.

“Unverified” means this research did not establish a reliable registration path/schema for the named product. It does not claim the product lacks MCP. Similar names, regional editions, MCP server products and MCP client products are not treated as interchangeable.

| Client | Provider ID | Registration | Path / method / schema | Evidence |
| --- | --- | --- | --- | --- |
| AdaL | `adal` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| AiderDesk | `aider-desk` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Amp | `amp` | Automatic | `.amp/settings.json`; JSONC, `amp.mcpServers`, command/args. | [Official source](https://ampcode.com/docs/customize/mcp) |
| Antigravity | `antigravity` | Manual | Use the MCP configuration UI; project-file registration not verified. | [Source](https://www.antigravity.google/docs/cli/mcp/) |
| Antigravity CLI | `antigravity-cli` | Manual | Use the `/mcp` manager and its stdio configuration; project-file registration not verified. | [Source](https://www.antigravity.google/docs/cli/mcp/) |
| AstrBot | `astrbot` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Augment | `augment` | Manual | Use `auggie mcp add` or pass an explicit JSON file with `--mcp-config`; user settings are in `~/.augment/settings.json`. | [Source](https://www.augmentcode.com/changelog/auggie-cli-0-5-4-release-notes) |
| AutoHand Code CLI | `autohand-code` | Manual | Use `autohand mcp add` with the exported launch command and args; project-file scope not verified. | [Source](https://docs.autohand.ai/working-with-autohand-code/mcp-servers) |
| Claude Code | `claude-code` | Automatic | `.mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://code.claude.com/docs/en/mcp) |
| Cline | `cline` | Manual | Open MCP Servers, then Configure MCP Servers, and merge the exported JSON; IDE and CLI storage differ by release. | [Source](https://github.com/cline/cline/blob/main/docs/mcp/mcp-overview.mdx) |
| Code Studio | `codestudio` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| CodeArts Agent | `codearts-agent` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| CodeBuddy | `codebuddy` | Manual | Create a workspace JSON config explicitly and pass it through `codebuddy --mcp-config <file>`; auto-discovery path not verified. | [Source](https://www.codebuddy.ai/docs/cli/cli-reference) |
| Codemaker | `codemaker` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Codex | `codex` | Automatic | `.codex/config.toml`; TOML named table, command/args. | [Official source](https://developers.openai.com/codex/mcp) |
| Command Code | `command-code` | Automatic | `.mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://commandcode.ai/docs/settings) |
| Continue | `continue` | Automatic | `.continue/mcpServers/testweave.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.continue.dev/customize/deep-dives/mcp) |
| Cortex Code | `cortex` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Crush | `crush` | Manual | Register a stdio server with `mcp add` in project `.crushrc` or `crushrc`; shell configuration is not edited automatically. | [Source](https://github.com/charmbracelet/crush) |
| Cursor | `cursor` | Automatic | `.cursor/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.cursor.com/context/model-context-protocol) |
| Deep Agents | `deepagents` | Automatic | `.mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.langchain.com/oss/deepagents/code/mcp-tools) |
| Devin for Terminal | `devin` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Dexto | `dexto` | Manual | Add a custom MCP connection through Dexto Connections; no verified project config adapter. | [Source](https://www.dexto.ai/docs/features/connections/) |
| Droid | `droid` | Automatic | `.factory/mcp.json`; JSONC, `mcpServers`, command/args, stdio type. | [Official source](https://docs.factory.com/harness/mcp) |
| Eve | `eve` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Firebender | `firebender` | Automatic | `firebender.json`; JSONC, `mcpServers`, command/args, stdio type. | [Official source](https://docs.firebender.com/context/mcp/overview) |
| ForgeCode | `forgecode` | Automatic | `.mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://forgecode.dev/docs/mcp-integration/) |
| fx | `fx` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Gemini CLI | `gemini-cli` | Automatic | `.gemini/settings.json`; JSONC, `mcpServers`, command/args. | [Official source](https://geminicli.com/docs/tools/mcp-server/) |
| GitHub Copilot | `github-copilot` | Automatic | `.mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Goose | `goose` | Manual | Run `goose configure`, choose Add Extension and a local stdio extension, and supply the exported launch. | [Source](https://goose.vcorp.ai/docs/getting-started/using-extensions/) |
| Grok Build | `grok` | Automatic | `.grok/config.toml`; TOML named table, command/args. | [Official source](https://docs.x.ai/build/settings) |
| Hermes Agent | `hermes-agent` | Manual | Configure a native MCP connection using the Hermes MCP guide; project-file scope not verified. | [Source](https://github.com/hermes-agent-org/hermes/blob/main/website/docs/user-guide/features/mcp.md) |
| IBM Bob | `bob` | Automatic | `.bob/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://bob.ibm.com/docs/shell/configuration/mcp/mcp-bobshell) |
| iFlow CLI | `iflow-cli` | Manual | Use the iFlow MCP manager or documented user configuration `~/.iflow/mcp/config.json`; project-file registration not verified. | [Source](https://platform.iflow.cn/en/cli/examples/mcp) |
| inference.sh | `inference-sh` | Remote service | MCP credentials and connector tools belong to the hosted service; a local stdio config is not a verified integration path. | [Source](https://inference.sh/docs/api/rest/credentials) |
| Jazz | `jazz` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Junie | `junie` | Automatic | `.junie/mcp/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://junie.jetbrains.com/docs/junie-cli-mcp-configuration.html) |
| Kilo Code | `kilo` | Automatic | `.kilo/kilo.jsonc`; JSONC, `mcp`, local type + command array. | [Official source](https://kilo.ai/docs/automate/mcp/using-in-kilo-code) |
| Kimchi | `kimchi` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Kimi Code CLI | `kimi-code-cli` | Automatic | `.kimi-code/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://www.kimi.com/en/help/kimi-code/cli-mcp) |
| Kiro CLI | `kiro-cli` | Automatic | `.kiro/settings/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://kiro.dev/docs/mcp/configuration/) |
| Kode | `kode` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Lingma | `lingma` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Loaf | `loaf` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| MCPJam | `mcpjam` | Manual | Connect a local server in MCPJam Inspector using the exported command and args; no verified auto-discovery path. | [Source](https://www.mcpjam.com/help/getting-started) |
| MiniMax Code | `minimax-code` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Mistral Vibe | `mistral-vibe` | Automatic | `.vibe/config.toml`; TOML array tables, name + transport + command/args. | [Official source](https://docs.mistral.ai/vibe/code/cli/mcp-servers) |
| Moxby | `moxby` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Mux | `mux` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Neovate | `neovate` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Ona | `ona` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| OpenClaw | `openclaw` | Manual | Use `openclaw mcp add` with `--command`, repeated `--arg`, and project `--cwd`; no verified project-file adapter. | [Source](https://docs.openclaw.ai/tools/mcp) |
| OpenCode | `opencode` | Automatic | `opencode.json`; JSONC, `mcp`, local type + command array. | [Official source](https://opencode.ai/docs/mcp-servers/) |
| OpenHands | `openhands` | Manual | Use `openhands mcp add` or merge exported JSON into user `~/.openhands/mcp.json`; restart the conversation. | [Source](https://github.com/OpenHands/docs/blob/main/openhands/usage/cli/mcp-servers.mdx) |
| Pi | `pi` | Extension required | MCP adapters are third-party Pi extensions; install and configure an adapter before registering TestWeave. | [Source](https://github.com/pzyyll/pi-mcp) |
| Pochi | `pochi` | Automatic | `.pochi/config.jsonc`; JSONC, `mcp`, command/args. | [Official source](https://docs.getpochi.com/mcp/) |
| Posit Assistant | `posit-assistant` | Automatic | `.posit/assistant/settings.json`; JSONC, `mcpServers`, local type + command array. | [Official source](https://assistant.posit.co/docs/reference/mcp-servers/) |
| PromptScript | `promptscript` | Compiler | Declare MCP in PromptScript and emit the target client configuration; PromptScript is not itself the tool-running client. | [Source](https://getpromptscript.dev/latest/reference/config/) |
| Qoder | `qoder` | Automatic | `.qoder/settings.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.qoder.com/cli/mcp-reference) |
| Qoder CN | `qoder-cn` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Qwen Code | `qwen-code` | Automatic | `.qwen/settings.json`; JSONC, `mcpServers`, command/args. | [Official source](https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/) |
| Reasonix | `reasonix` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Replit | `replit` | Remote service | Use Replit MCP integrations; this package only serves local stdio, so a compatible hosted transport would need separate work. | [Source](https://docs.replit.com/pt/references/mcp/overview) |
| Roo Code | `roo` | Automatic | `.roo/mcp.json`; JSONC, `mcpServers`, command/args. | [Official source](https://docs.roocode.com/features/mcp/using-mcp-in-roo) |
| Rovo Dev | `rovodev` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Sarvam Code | `sarvam-code` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Tabnine CLI | `tabnine-cli` | CLI unverified | Tabnine Agent documents `.tabnine/mcp_servers.json`, but applicability to the catalog CLI edition is unverified. | [Source](https://docs.tabnine.com/main/getting-started/tabnine-agent/mcp-intro-and-setup) |
| Terramind | `terramind` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Tinycloud | `tinycloud` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Trae | `trae` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Trae CN | `trae-cn` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| VS Code | `vscode` | Automatic | `.vscode/mcp.json`; JSONC, `servers`, command/args, stdio type. | [Official source](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) |
| Warp | `warp` | Manual | Use `/add-mcp` or Warp MCP server settings with the exported launch; no verified project-file adapter. | [Source](https://docs.warp.dev/agents/capabilities/slash-commands/) |
| Windsurf | `windsurf` | Manual | Open Cascade MCP config and merge the exported JSON. Current official Windsurf docs redirect to Devin Desktop; project scope is unverified. | [Source](https://docs.windsurf.com/windsurf/cascade/mcp) |
| ZCode | `zcode` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Zed | `zed` | Manual | Use Agent Settings, MCP Servers, or the settings JSON under `context_servers`; project-file scope not verified. | [Source](https://zed.dev/docs/ai/agent-settings) |
| Zencoder | `zencoder` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |
| Zenflow | `zenflow` | Unverified | No sufficiently verified project MCP path and schema found in this research pass; skill installation remains available. | — |

Mistral's project config location is documented separately in its [configuration guide](https://docs.mistral.ai/vibe/code/cli/configuration). Qwen's MCP fields are documented in the [official MCP reference](https://github.com/QwenLM/qwen-code/blob/main/docs/developers/tools/mcp-server.md).
