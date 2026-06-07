# Phase 3 Task 1: antigravity-cli Provider

> **For agentic workers:** REQUIRED SUB-SKILL: `subagent-driven-development`. Spec review → quality review per task.

**Goal:** Wake Antigravity via `agy -p` when relayd sees a plan for node `antigravity`.

**Architecture:** Same pattern as hermes/codex/cursor — `buildAntigravitySpawn(task, ctx)` in `src/providers/antigravity.mjs`, register `antigravity-cli` in `relayd.mjs` PROVIDERS map.

**Reference:** `docs/FOCUS.md` — `agy -p "..." --dangerously-skip-permissions`, cwd=projectPath.

---

## Task 1: Provider + tests

**Files:**
- Create: `src/providers/antigravity.mjs`
- Modify: `src/relayd.mjs` (import + PROVIDERS entry)
- Create: `test/antigravity-provider.test.mjs`
- Modify: `test/relayd.test.mjs` (one test: buildSpawnForTask returns antigravity spec)

**Requirements:**
- [ ] `buildAntigravitySpawn` uses `ctx.binary || 'agy'`
- [ ] args include `-p`, prompt with markdown + `relaySendInstruction`, `--dangerously-skip-permissions`
- [ ] `env: { AGENT_RELAY_HOME: ctx.home }`, spawn cwd = `task.projectPath` (via relayd spawn, not args if others use cwd in spawn options)
- [ ] Shell-safe send instruction (already in util.mjs)
- [ ] `npm test` all pass

**Acceptance:** `npm test` green; no new npm deps.
