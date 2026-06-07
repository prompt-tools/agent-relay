# Phase 3 Task 2: relay serve Web 面板

> **For agentic workers:** `subagent-driven-development` + dual review.

**Goal:** Zero-dep HTTP dashboard for task observability (complement `relay watch`).

**Architecture:** `src/serve.mjs` uses `node:http`; reuse `buildWatchSnapshot` + `healthReport` from watch/health. `bin/relay.js` adds `relay serve [--port 3847] [--host 127.0.0.1]`.

---

## Task 2: HTTP server + minimal UI

**Files:**
- Create: `src/serve.mjs` — `createServeHandler(config)`, `startServe(config, opts)`
- Modify: `bin/relay.js` — `relay serve` command, usage line
- Create: `test/serve.test.mjs` — start server on ephemeral port, fetch `/api/watch` and `/api/health`, assert JSON ok

**Routes:**
- `GET /api/watch` → `application/json` buildWatchSnapshot(config)
- `GET /api/health` → healthReport JSON
- `GET /` → minimal inline HTML (no external assets): title, auto-refresh every 5s via fetch to /api/watch, show counts + active + progress tables

**Requirements:**
- [ ] Default bind `127.0.0.1` only (local safety)
- [ ] Zero new npm deps
- [ ] SIGINT closes server cleanly
- [ ] `npm test` all pass

**Acceptance:** 50+ tests green; manual `relay serve` loads in browser (document in comment only).
