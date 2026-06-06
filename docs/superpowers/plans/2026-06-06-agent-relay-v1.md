# agent-relay v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 本机 Agent 任务邮政局 — `send` 派活 → `relayd` 唤醒目标 CLI → 做完再 `send` 回传，无需开对方 IDE。

**Architecture:** 全局文件队列 `~/.agent-relay/tasks/pending/<node>/`；对称原语 `send` + `receive`（含 claim）；`relayd` 单实例 watch pending 并按 `nodes.yaml` spawn provider；MCP 与 CLI 同构。

**Tech Stack:** Node.js ≥20 ESM、launchd、stdio MCP、各 Agent CLI（codex/hermes/agent/agy）

**Source of truth:** `docs/PRINCIPLES.md`, `docs/FOCUS.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/schema.mjs` | 信封校验、`type` 枚举 |
| `src/store.mjs` | send / receive / claim（废弃 inbox/complete/pull） |
| `src/paths.mjs` | 目录布局（去掉 inbox） |
| `src/config.mjs` | `config.json` + `nodes.yaml` 加载 |
| `src/nodes.mjs` | 节点注册表读写 |
| `src/providers/index.mjs` | provider 注册表 |
| `src/providers/codex.mjs` | codex-exec 唤醒 |
| `src/relayd.mjs` | daemon 主循环 |
| `bin/relay.js` | CLI 入口 |
| `bin/relayd.js` | daemon 入口 |
| `mcp/server.mjs` | stdio MCP：`relay_send`, `relay_receive` |
| `scripts/setup.mjs` | `relay setup` 向导 |
| `test/store.test.mjs` | 核心协议测试 |
| `test/relayd.test.mjs` | daemon 去重/spawn 测试 |

---

### Task 1: 协议 schema

**Files:**
- Create: `src/schema.mjs`
- Modify: `docs/TASK-SCHEMA.md`

- [ ] **Step 1: Write schema module**

```javascript
// src/schema.mjs
export const TASK_TYPES = ['plan', 'result', 'failed', 'progress'];

export function validateEnvelope(task) {
  if (!task.id || !task.from || !task.to) throw new Error('id, from, to required');
  if (!task.projectPath) throw new Error('projectPath required');
  if (!TASK_TYPES.includes(task.type)) throw new Error(`type must be one of ${TASK_TYPES.join(', ')}`);
  if (task.type === 'result' || task.type === 'failed') {
    if (!task.taskId) throw new Error('taskId required for result/failed');
  }
  return task;
}
```

- [ ] **Step 2: Update TASK-SCHEMA.md** — 对称 send 模型，废弃 inbox 段落

- [ ] **Step 3: Run tests** — `npm test`（现有测试仍绿）

---

### Task 2: store 迁移（TDD）

**Files:**
- Modify: `src/store.mjs`, `src/paths.mjs`, `test/store.test.mjs`, `bin/relay.js`

- [ ] **Step 1: 写失败测试** — `send(plan) → claim → send(result) → list pending(cursor)`

```javascript
// test/store.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask, receiveTasks } from '../src/store.mjs';

test('send → claim → send result back', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-'));
  try {
    const config = initConfig(home, 'cursor');
    const plan = sendTask(config, {
      type: 'plan',
      to: 'codex',
      from: 'cursor',
      projectPath: '/tmp/proj',
      title: 'Test',
      body: { markdown: '## Do thing' },
    });
    assert.equal(plan.type, 'plan');
    const claimed = claimTask(config, 'codex', plan.id);
    assert.equal(claimed.status, 'active');
    const result = sendTask(config, {
      type: 'result',
      to: 'cursor',
      from: 'codex',
      projectPath: '/tmp/proj',
      taskId: plan.id,
      title: 'Done',
      body: { summary: 'ok' },
    });
    assert.equal(result.type, 'result');
    const inbox = receiveTasks(config, 'cursor');
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].taskId, plan.id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 跑测试确认 FAIL** — `npm test`

- [ ] **Step 3: 改 store.mjs**
  - `sendTask` 接受 `type`, `projectPath`, `body`, `taskId`
  - 文件名统一 `{id}.json`
  - 删除 `writeResult`, `completeTask`, `failTask`, `pullInbox`
  - 新增 `receiveTasks(config, node)` = `listTasks(config, node, 'pending')`
  - `paths.mjs` 去掉 `inbox`

- [ ] **Step 4: 改 relay.js** — `receive` 子命令；`pull/complete/fail` 打印 deprecated 指引

- [ ] **Step 5: 跑测试 PASS** — `npm test`

---

### Task 3: nodes.yaml 注册表

**Files:**
- Create: `src/nodes.mjs`
- Modify: `src/config.mjs`, `config.example.yaml`

- [ ] **Step 1: nodes.mjs**

```javascript
// src/nodes.mjs — ~/.agent-relay/nodes.yaml
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function nodesPath(home) { return join(home, 'nodes.yaml'); }

export function loadNodes(home) {
  const p = nodesPath(home);
  if (!existsSync(p)) return { nodes: {} };
  // minimal YAML: use JSON for v1 if no yaml dep
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function saveNodes(home, data) {
  writeFileSync(nodesPath(home), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

export function getProvider(home, nodeId) {
  const { nodes } = loadNodes(home);
  return nodes[nodeId]?.provider || 'manual';
}
```

- [ ] **Step 2: 测试** — `test/nodes.test.mjs` 读写 roundtrip

- [ ] **Step 3: `npm test` PASS**

---

### Task 4: relayd 骨架

**Files:**
- Create: `src/relayd.mjs`, `bin/relayd.js`, `test/relayd.test.mjs`

- [ ] **Step 1: relayd 核心逻辑**
  - 单实例 lock 文件 `~/.agent-relay/relayd.pid`
  - poll `tasks/pending/<localNode>/` 每 2s
  - 已处理 task id 集合去重（`processed.json`）
  - 见新 plan → claim → 按 provider spawn（v1 先 log + manual）

- [ ] **Step 2: codex provider**

```javascript
// src/providers/codex.mjs
export function buildCodexCommand(task, config) {
  const prompt = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}. When done, run: relay send ${task.from} --type result --task-id ${task.id} --summary "..."`;
  return {
    cmd: 'codex',
    args: ['exec', prompt, '--cwd', task.projectPath],
  };
}
```

- [ ] **Step 3: 测试 spawn 参数生成（不真跑 codex）**

- [ ] **Step 4: `npm test` PASS**

---

### Task 5: relay setup 向导

**Files:**
- Create: `scripts/setup.mjs`

- [ ] **Step 1: 交互流程**
  1. 选角色：sender / receiver / both
  2. 设 nodeId
  3. 检测 CLI（which codex/agent/hermes/agy）
  4. 写 `nodes.yaml`
  5. 合并 `~/.cursor/mcp.json`（jq 模式，借鉴 cairn）
  6. 写 launchd plist `~/Library/LaunchAgents/com.agent-relay.relayd.plist`

- [ ] **Step 2: `relay setup` 子命令挂到 bin/relay.js**

---

### Task 6: MCP server

**Files:**
- Create: `mcp/server.mjs`

- [ ] **Step 1: stdio MCP**
  - `relay_send` → `sendTask`
  - `relay_receive` → `receiveTasks` + optional `claim`

- [ ] **Step 2: package.json 加 `"relay-mcp": "./mcp/server.mjs"`

- [ ] **Step 3: 手动 smoke** — `echo '{"jsonrpc":"2.0",...}' | node mcp/server.mjs`

---

### Task 7: E2E 文档 + 对齐

**Files:**
- Modify: `docs/VISION.md`, `docs/ARCHITECTURE.md`, `README.md`

- [ ] **Step 1: E2E 步骤文档** — cursor send → relayd → codex → result 出现在 pending/cursor

- [ ] **Step 2: 成功标准 checklist**

---

## Self-review

| FOCUS 项 | Task |
|----------|------|
| 协议 send/receive + type + projectPath | Task 1–2 |
| Core 路径 + claim | Task 2 |
| relayd + provider | Task 4 |
| relay setup | Task 5 |
| MCP | Task 6 |
| E2E cursor→codex | Task 4+7 |
| 文档 | Task 7 |

## 执行顺序

1. Task 1 → 2（协议，必须先做）
2. Task 3（nodes.yaml）
3. Task 4（relayd）
4. Task 5 + 6（可并行）
5. Task 7（收尾）
