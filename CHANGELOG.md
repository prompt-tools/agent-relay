# Changelog

All notable changes to agent-relay. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- `archivePlanOnResult` — result send archives plan to `done/` (internal, no `complete` CLI)
- `relay gc` — remove orphan pending plans already in `relayd.processed`
- `health` check `orphanPendingPlans`
- `test/e2e-relayd.test.mjs` — CI-provable cursor→hermes→cursor loop
- `relay smoke` — live end-to-end smoke with poll + JSON result
- Cross-machine research/design archived under `docs/archive/cross-machine-sync/`

## [0.2.0] - 2026-06-07

### Added

- `cursor-agent` provider (`agent --workspace --print`)
- Failure retry (`relayd.retries.json`, max 3 attempts)
- `relay recover` CLI and `src/recover.mjs`
- `stuckActive` in health report
- Context budget protocol in `AGENTS.md` and Cursor rules

### Fixed

- `handleWakeFailure` clears `processed` so async spawn errors can retry
- `recoverTask` writes updated task JSON to disk after move
- `relay recover --older-than` `remaining` count uses same threshold
- `relaySendInstruction` shell-quotes paths and node ids

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

[Unreleased]: https://github.com/prompt-tools/agent-relay/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.2.0
[0.1.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.1.0
