# agent-relay

Local agent task relay: **send a plan from Cursor → relayd wakes Hermes → results sent back**.

> [中文文档 / Chinese README](docs/README-zh.md)

## Install

```bash
npm install -g @prompt-tools/agent-relay
```

## Quick Start

```bash
# Configure for both sender + receiver roles
relay setup --role both --yes

# Verify everything works
relay health
```

## How It Works

```
Cursor   relay send hermes       →  pending/hermes/
relayd   claim + hermes chat     →  active/hermes/
Hermes   relay send cursor       →  pending/cursor/ (type=result)
         plan archived            →  done/hermes/
Cursor   relay receive cursor    →  read result
```

The relay uses a filesystem-based task queue. `relayd` watches for incoming tasks and wakes the appropriate agent. MCP tools (`relay_send`, `relay_receive`) are available for Cursor integration.

## Commands

| Command | Description |
|---------|-------------|
| `relay setup --role <role> --yes` | Configure sender/receiver/both |
| `relay send --project . --title "..." --plan-text "..."` | Send a task to a target node |
| `relay receive <node> [--type result]` | List and claim pending tasks |
| `relay health` | Run all health checks |
| `relay smoke --project .` | Live end-to-end test (~10–30s) |
| `relay watch --once` | Snapshot of queue / active / logs |
| `relay serve` | Local dashboard at http://127.0.0.1:3847 |
| `relay gc --yes` | Clean orphaned pending tasks |
| `relay recover <node>` | Move stuck tasks back to pending |

## Prerequisites

- **Node.js >= 20**
- **macOS**: launchd is auto-configured by `relay setup`
- **Linux**: run `relayd` manually or configure a systemd unit
- **Optional CLI tools**: `hermes`, `agent` (cursor-agent), `codex`

## MCP Integration (Cursor)

`relay setup` merges an MCP entry into `~/.cursor/mcp.json`. Restart Cursor after setup. Tools: `relay_send`, `relay_receive`.

## Documentation

| File | Content |
|------|---------|
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Operations: daily checks, send/receive, troubleshooting |
| [docs/AGENT-CONTRACT.md](docs/AGENT-CONTRACT.md) | Agent work contract (Hermes delegation + review) |
| [docs/E2E.md](docs/E2E.md) | E2E and smoke tests |
| [docs/SETUP.md](docs/SETUP.md) | Installation and OAuth |
| [docs/PRINCIPLES.md](docs/PRINCIPLES.md) | Design principles |
| [docs/MEMORY.md](docs/MEMORY.md) | Decisions and pitfalls |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## License

[MIT](LICENSE)
