# P1 Distribution Readiness — Implementation Plan

**Date:** 2026-06-07  
**Project:** agent-relay (`@prompt-tools/agent-relay` v0.3.0)  
**Status:** P0 complete (scoped name, files field, platform guards, English README, dynamic MCP version, 62/62 tests)

---

## Research Summary

### P0 confirmed done
- **package.json**: `name: @prompt-tools/agent-relay`, `files` field present, `engines: >=20`, zero runtime deps
- **mcp/server.mjs**: Version reads dynamically from `package.json` (line 10) ✅
- **README.md**: English, mentions optional CLI tools on line 54 but only as a terse one-liner

### No CI exists
- No `.github/workflows/` directory found

### JSDoc status — all bare
Every exported function in the three inspected source files lacks JSDoc:

| File | Exported functions | JSDoc? |
|------|--------------------|--------|
| `src/store.mjs` | `newTaskId`, `sendTask`, `listTasks`, `receiveTasks`, `claimTask`, `status`, `showTask` | ❌ none |
| `src/store.mjs` | `archivePlanOnResult` | ✅ has one (line 96) |
| `src/config.mjs` | `loadConfig`, `initConfig`, `assertNode` | ❌ none |
| `src/paths.mjs` | `expandHome`, `resolveHome`, `layout`, `ensureLayout` | ❌ none |
| `src/relayd.mjs` | `loadProcessed`, `saveProcessed`, `loadRetries`, `saveRetries`, `acquireLock`, `releaseLock`, `buildSpawnForTask`, `wakeTask`, `handleWakeFailure`, `tick` | ❌ none |
| `src/project.mjs` | `resolveSendTarget` (imported by bin/relay.js) | ❌ not inspected but imported |
| `src/health.mjs` | `healthReport` (imported by bin/relay.js) | ❌ not inspected but imported |
| `src/recover.mjs` | `recoverTask`, `recoverAllStuck`, `listStuckActive` (imported by bin/relay.js) | ❌ not inspected but imported |

### README external deps status
Line 54: `- **Optional CLI tools**: `hermes`, `agent` (cursor-agent), `codex``
This exists but is buried in Prerequisites with no explanation of what each does, when it's needed, or how to install it. Needs expansion.

---

## Task 1: GitHub Actions CI

**File:** `.github/workflows/ci.yml` (create new)

### Content
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22]
        os: [macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm install
      - run: npm test
```

### Acceptance Criteria
- [ ] `.github/workflows/ci.yml` exists
- [ ] 4-job matrix: Node 20 × {macOS, Ubuntu} + Node 22 × {macOS, Ubuntu}
- [ ] Triggers on push to `main` and all PRs
- [ ] Uses `actions/checkout@v4` and `actions/setup-node@v4`
- [ ] Runs `npm install` then `npm test`

---

## Task 2: npm Publish Workflow

**File:** `.github/workflows/publish.yml` (create new)

### Content
```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup Required (document in plan)
1. Create npm access token at https://www.npmjs.com/settings (Granular Access Token, scoped to `@prompt-tools`)
2. Add as GitHub repo secret named `NPM_TOKEN` at Settings → Secrets → Actions
3. Ensure `@prompt-tools` org exists on npm and the publish token has write access

### Acceptance Criteria
- [ ] `.github/workflows/publish.yml` exists
- [ ] Triggers on GitHub release `published` event
- [ ] Runs tests before publish (guard)
- [ ] Uses `npm publish --access public` (required for scoped packages)
- [ ] References `secrets.NPM_TOKEN`
- [ ] `registry-url` set in setup-node step

---

## Task 3: JSDoc on Public Exports

**Scope:** Only functions called from `bin/relay.js`, `bin/relayd.js`, and `mcp/server.mjs`. Internal helpers are excluded.

### Functions to annotate

#### `src/store.mjs` (7 functions)
| Function | Called from | JSDoc needed |
|----------|-----------|--------------|
| `newTaskId()` | internal, but exported | `/** Generate a timestamp-based task ID (YYYYMMDD-HHMMSS-xxxx). */` |
| `sendTask(config, input)` | bin/relay.js, mcp/server.mjs | `/** Create a task envelope and write it to the target node's pending queue. @param {object} config - Relay config from loadConfig() @param {object} input - {type, to, from, projectPath, title, body, taskId, acceptance, refs} @returns {object} The validated task envelope */` |
| `listTasks(config, node, status)` | bin/relay.js | `/** List tasks in a given bucket for a node. @param {object} config @param {string} node - Node id @param {string} [status='pending'] - Bucket: pending, active, done, failed @returns {object[]} Task envelopes sorted by createdAt descending */` |
| `receiveTasks(config, node, opts)` | bin/relay.js, mcp/server.mjs | `/** List pending tasks for a node, optionally filtered by type. @param {object} config @param {string} node @param {{type?: string}} [opts] @returns {object[]} */` |
| `claimTask(config, node, id)` | bin/relay.js, mcp/server.mjs | `/** Move a pending task to active (claim it for execution). If no id given, claims the oldest pending task. @param {object} config @param {string} node @param {string} [id] - Specific task id, or omit for oldest @returns {object} The claimed task envelope @throws {Error} If no pending tasks or claim fails */` |
| `status(config)` | bin/relay.js | `/** Return task counts per node per bucket. @param {object} config @returns {{home: string, nodeId: string, counts: object}} */` |
| `showTask(config, id)` | bin/relay.js | `/** Find and return a task by id across all buckets and nodes. @param {object} config @param {string} id @returns {{bucket: string, node: string, path: string, task: object}} @throws {Error} If task not found */` |

Already has JSDoc — skip: `archivePlanOnResult`

#### `src/config.mjs` (3 functions)
| Function | Called from | JSDoc needed |
|----------|-----------|--------------|
| `loadConfig(home?)` | bin/relay.js, mcp/server.mjs | `/** Load relay config, creating default if none exists. @param {string} [home] - Override AGENT_RELAY_HOME @returns {{nodeId: string, home: string, nodes: string[]}} */` |
| `initConfig(home?, nodeId?)` | bin/relay.js | `/** Initialize relay config directory and write config.json if absent. @param {string} [home] @param {string} [nodeId='cursor'] @returns {object} Loaded config */` |
| `assertNode(config, name)` | internal (store.mjs) | `/** Validate that a node id is in the config's known nodes list. @param {object} config @param {string} name @throws {Error} If node unknown */` |

#### `src/paths.mjs` (4 functions)
| Function | Called from | JSDoc needed |
|----------|-----------|--------------|
| `expandHome(p)` | internal | `/** Expand ~ to the OS home directory. @param {string} p @returns {string} */` |
| `resolveHome(explicit?)` | bin/relayd.js | `/** Resolve the agent-relay home directory from explicit arg, env, or default. @param {string} [explicit] @returns {string} Absolute path */` |
| `layout(home?)` | internal (store, relayd) | `/** Return the directory layout object for a given home. @param {string} [home] @returns {object} Layout with paths and bucket accessors */` |
| `ensureLayout(home?)` | internal (store, config) | `/** Create all required directories under home if they don't exist. @param {string} [home] @returns {object} Layout object */` |

#### `src/relayd.mjs` (3 public-facing functions)
| Function | Called from | JSDoc needed |
|----------|-----------|--------------|
| `acquireLock(home)` | bin/relayd.js | `/** Acquire a PID lock file. Returns false if relayd is already running. @param {string} home @returns {boolean} */` |
| `releaseLock(home)` | bin/relayd.js | `/** Release the PID lock file. @param {string} home */` |
| `tick(home, opts?)` | bin/relayd.js | `/** One poll cycle: find pending plans, claim them, wake agents. @param {string} home @param {{spawnFn?: Function}} [opts] @returns {object[]} Results per processed task */` |

Also add to these (imported by bin/relay.js, not yet inspected — inspect and write proper JSDoc):
- `src/project.mjs`: `resolveSendTarget`
- `src/health.mjs`: `healthReport`
- `src/recover.mjs`: `recoverTask`, `recoverAllStuck`, `listStuckActive`

Additionally, `src/nodes.mjs` exports need JSDoc:
- `getProvider` — retrieve a provider handler by name
- `getNodeSpec` — return the spec/definition for a given node id

### Acceptance Criteria
- [ ] Every function listed above has a JSDoc comment block with `@param` and `@returns`/`@throws`
- [ ] No changes to function signatures or logic — comments only
- [ ] `npm test` still passes (62/62)
- [ ] `archivePlanOnResult` left as-is (already documented)

---

## Task 4: External CLI Dependencies Documentation

**File:** `README.md` (modify existing)

### Current State
Line 54 has a terse one-liner:
```
- **Optional CLI tools**: `hermes`, `agent` (cursor-agent), `codex`
```

### Plan
Replace the one-liner with a subsection under Prerequisites:

```markdown
### Optional CLI Agents

agent-relay wakes external AI agents via their CLI tools. Install only the ones you use:

| Tool | Package / Install | When needed |
|------|-------------------|-------------|
| `hermes` | `npm install -g hermes-agent` | Receiving node runs Hermes |
| `cursor-agent` | Installed with Cursor IDE | Receiving node runs Cursor agent mode |
| `codex` | `npm install -g @openai/codex` | Receiving node runs Codex |
| `agy` | npm: `npm i -g @nicepkg/antigravity-cli`, Homebrew (macOS): `brew install nicepkg/tap/antigravity` | Receiving node runs Antigravity |

If a CLI tool is not installed, `relayd` logs a spawn error and retries — it does not crash.
```

### Placement
Insert after the existing Prerequisites bullet list (after line 54), before the "## MCP Integration" section.

### Acceptance Criteria
- [ ] README has a "### Optional CLI Agents" subsection under Prerequisites
- [ ] Lists hermes, cursor-agent, codex with install commands
- [ ] Lists `agy` (antigravity) binary — install via npm or homebrew (TBD) — needed when receiving node runs Antigravity
- [ ] Explains graceful failure behavior (no crash if missing)
- [ ] `git diff README.md` shows only additions in Prerequisites section (no deletions or structural changes elsewhere)

---

## Execution Order

1. **Task 3** (JSDoc) — comments-only, zero risk, quick win
2. **Task 4** (README deps) — documentation only
3. **Task 1** (CI workflow) — create file, test by pushing
4. **Task 2** (publish workflow) — create file, requires NPM_TOKEN secret setup

## Verification

After all tasks:
- `npm test` passes (62/62)
- Push to branch → CI matrix runs (4 jobs)
- Create a draft GitHub release → publish workflow triggers (but fails gracefully until NPM_TOKEN is set)
- `git diff --stat` shows only new files + comment/doc changes
