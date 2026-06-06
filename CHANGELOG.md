# Changelog

All notable changes to agent-relay. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- `scripts/auth.mjs` — role-based OAuth checks (`hermes login`, etc.)
- Interactive `relay setup` with readline prompts
- `launchctl bootstrap` after writing launchd plist
- `src/project.mjs` — `.agent-relay/project.yaml` default routing
- `docs/SETUP.md`, `docs/MEMORY.md`, `docs/WORKLOG.md`, `AGENTS.md`
- `.cursor/rules/agent-relay.mdc` for Cursor agents
- relayd structured error logging to `relay.log`

## [0.1.0] - 2026-06-07

### Added

- Symmetric v2 protocol: `send` / `receive`, `type`, `projectPath`
- `relayd` daemon with single-instance lock and dedup
- Providers: `hermes-cli`, `codex-exec`
- MCP server: `relay_send`, `relay_receive`
- `relay setup` — nodes.yaml, MCP merge, launchd plist
- Hermes E2E verified (cursor → hermes → cursor)

### Removed

- `inbox`, `pull`, `complete`, `fail` CLI semantics (deprecated messages remain)

### Changed

- Task files: `{id}.json` (was `{id}.plan.json`)
- Docs aligned to PRINCIPLES.md / Hermes primary path

[Unreleased]: https://github.com/prompt-tools/agent-relay/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.1.0
