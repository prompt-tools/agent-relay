# Changelog

All notable changes to agent-relay. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.5.0] - 2026-06-07

### Changed

- Provider 4 files merged into `src/providers/index.mjs` (data-driven `PROVIDER_SPECS` registry)
- `newTaskId` hardened: `toISOString()` + `randomBytes(4)` (32-bit randomness, was 16-bit)
- `ensureLayout` no longer hardcodes node names — directories auto-created on first write
- `detectClis`/`isCliReady`/`runCapture` moved from `scripts/` to `src/detect.mjs` (fix reverse dependency)
- Config files: `nodes.yaml` → `nodes.json`, `project.yaml` → `project.json` (auto-migration on load)

### Added

- Tick error recovery: stuck active tasks auto-recover to pending on tick failure
- Archive rename failures now logged (was silently swallowed)

### Removed

- Dead exports: `expandHome`, `newTaskId`, `archivePlanOnResult` from src/
- Dead functions: `launchdPlistPath`, `unloadLaunchd` from scripts/
- `.plan.json` backward compatibility code from store.mjs
- `legacyPlan`/`planMarkdown` branch from `sendTask`
- 12 unused exports from scripts/ (setup, auth, setup-tui)

## [0.4.0] - 2026-06-07

### Added

- Scoped npm package name `@prompt-tools/agent-relay`
- `files` field in package.json (bin/, src/, mcp/, scripts/)
- `author`, `repository`, `homepage`, `bugs` fields
- Platform guard for launchd (macOS-only, graceful skip on Linux)
- `command -v` replaced with cross-platform `which`/`where` in setup.mjs
- English README with installation docs and optional CLI agents table
- Dynamic MCP version from package.json (no hardcoded string)
- GitHub Actions CI workflow (Node 20/22 × macOS/Ubuntu)
- npm publish workflow (triggered on GitHub Release)
- JSDoc on 8 source files (74 @param tags)

### Changed

- README rewritten in English; Chinese README moved to docs/README-zh.md
- Config example: `config.example.yaml` replaced with `config.example.json`

### Removed

- Deprecated `relay pull`, `relay complete`, `relay fail` CLI stubs (use `relay send`/`relay receive`)

## [0.3.0] - 2026-06-07

### Added

- `antigravity-cli` provider (`agy -p` + `--dangerously-skip-permissions`)
- `relay serve` — HTTP dashboard with `/api/watch`, `/api/health`, inline HTML panel
- `relay smoke` — live end-to-end smoke with poll + JSON result
- `relay gc` — remove orphan pending plans already in `relayd.processed`
- `archivePlanOnResult` — result send archives plan to `done/`
- `test/e2e-relayd.test.mjs` — CI-provable cursor→hermes→cursor loop
- `health` check `orphanPendingPlans`
- `relay watch` — progress/active/log terminal panel
- setup TUI — numbered menu + y/n confirmation
- Cross-machine research/design archived under `docs/archive/cross-machine-sync/`

### Fixed

- `relay watch` emit 错误写入 stderr，避免静默失败

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

[Unreleased]: https://github.com/prompt-tools/agent-relay/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.5.0
[0.4.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.4.0
[0.3.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.3.0
[0.2.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.2.0
[0.1.0]: https://github.com/prompt-tools/agent-relay/releases/tag/v0.1.0
