# 本机 E2E 验收 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `subagent-driven-development`  
> **Design:** `docs/superpowers/specs/2026-06-07-local-e2e-acceptance-design.md`  
> **Research:** `docs/research/2026-06-07-local-e2e-acceptance.md`

**Goal:** CI-provable cursor→hermes→cursor loop via relayd fake spawn; queue hygiene via health orphans + `relay gc`; plan archives to `done/` on result send.

**Architecture:** Extend `store.mjs` with internal `archivePlanOnResult`; `health.mjs` + `gc.mjs` for orphans; one integration test driving full tick.

**Tech Stack:** Node 20+ stdlib only.

---

## Task 1: archivePlanOnResult in store

**Files:** `src/store.mjs`, `test/store.test.mjs`

- [ ] Add `archivePlanOnResult(config, executorNode, taskId)` — rename `active/<node>/<id>.json` → `done/<node>/`, set `status:done`, `completedAt`
- [ ] Call from `sendTask` when `type==='result' && taskId`
- [ ] Test: send plan → claim → send result → plan in done, result in pending/cursor

## Task 2: health orphanPendingPlans

**Files:** `src/health.mjs`, `test/health.test.mjs`

- [ ] Load processed set; scan pending plans where `id ∈ processed`
- [ ] Expose in `healthReport.checks.orphanPendingPlans` array
- [ ] Test with temp home fixture

## Task 3: relay gc

**Files:** `src/gc.mjs`, `bin/relay.js`, `test/gc.test.mjs`

- [ ] `gcOrphanPendingPlans(config, { dryRun })` — delete plan pending where id ∈ processed
- [ ] CLI: `relay gc [--dry-run] [--yes]`
- [ ] Tests: dry-run no delete; yes deletes orphan only

## Task 4: e2e-relayd integration test

**Files:** `test/e2e-relayd.test.mjs`

- [ ] temp home, hermes node, nodes.yaml hermes-cli
- [ ] fake spawn runs embedded relay send result (parse args or call sendTask)
- [ ] tick once: assert active then after executor assert cursor result + plan done

## Task 5: docs + ROADMAP

**Files:** `docs/E2E.md`, `docs/RELIABILITY.md`, `docs/ROADMAP.md`, `docs/WORKLOG.md`

- [ ] E2E.md automated section
- [ ] RELIABILITY inbox → send one-liner fix
- [ ] ROADMAP check 本机 E2E
- [ ] WORKLOG entry

## Task 6: verification

- [ ] `npm test` all pass
- [ ] Run `relay gc --yes` on prod home (optional in implementer)
