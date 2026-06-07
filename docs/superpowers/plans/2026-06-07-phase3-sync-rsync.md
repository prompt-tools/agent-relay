# Phase 3a: relay sync (rsync) Implementation Plan

> **封存** — 见 [`docs/archive/cross-machine-sync/README.md`](../../archive/cross-machine-sync/README.md)。本机 E2E 稳定后再执行。

> **For agentic workers:** REQUIRED SUB-SKILL: `subagent-driven-development`  
> **Design:** `docs/superpowers/specs/2026-06-07-cross-machine-sync-design.md`  
> **Research:** `docs/research/2026-06-07-cross-machine-sync.md`

**Goal:** `relay sync push|pull|status` to rsync only `tasks/pending/<node>/` between two machines; meta paths never synced.

**Architecture:** `src/sync.mjs` builds allowlisted rsync commands; CLI wraps ssh+rsync; `docs/SYNC.md` documents two-machine setup.

**Tech Stack:** Node 20+ stdlib only (`child_process.execFile`), existing `layout()` paths.

---

## Task 1: sync path allowlist + rsync builder

**Files:** Create `src/sync.mjs`, `test/sync.test.mjs`

- [ ] `SYNC_META_DENY` — reject paths matching relayd.pid, processed, retries, nodes, config
- [ ] `buildRsyncPush(config, { peer, remoteHome, node, direction })` → `{ cmd, args }` for `rsync -az`
- [ ] `buildRsyncPull(...)` symmetric for result return
- [ ] Tests: meta deny, push/pull arg includes correct pending subpath only

## Task 2: CLI `relay sync`

**Files:** Modify `bin/relay.js`, usage string

- [ ] `relay sync push|pull|status --peer user@host [--remote-home ~/.agent-relay] [--node hermes]`
- [ ] Default node: infer from direction (push → remote receiver node; pull → local nodeId)
- [ ] `status` prints last sync config / dry-run command (no network in test)
- [ ] exec rsync via `execFile`; errors → JSON `{ ok: false, error }`

## Task 3: docs SYNC.md + SETUP checklist

**Files:** Create `docs/SYNC.md`, patch `docs/SETUP.md` (short checklist link)

- [ ] Two-machine diagram (cursor ↔ hermes)
- [ ] Rule: one relayd per logical node
- [ ] cron example every 30s
- [ ] projectPath same clone path note

## Task 4: verification

- [ ] `npm test` all pass
- [ ] WORKLOG + CHANGELOG Unreleased line

**Out of scope this plan:** pathMap, git sync, health dual-node automation, sync active/done
