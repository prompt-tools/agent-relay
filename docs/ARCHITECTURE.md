# Architecture

> 以 `PRINCIPLES.md` 为准。v2 对称 **send/receive**，无 inbox。

## 设计原则

1. **文件即队列** — 无数据库，原子写 + rename claim
2. **对称原语** — 仅 `send` 与 `receive`（含 claim）
3. **CLI 与 MCP 同构** — 同一套 `src/store.mjs`
4. **daemon 唤醒** — `relayd` 见 pending plan → spawn provider CLI

## 目录布局（`~/.agent-relay/`）

```
~/.agent-relay/
  config.json          # 本机 nodeId
  nodes.yaml           # 节点 → wake provider（JSON 格式 v1）
  relayd.pid           # 单实例锁
  relayd.processed.json
  tasks/
    pending/<node>/    # 待处理（含回传的 result）
    active/<node>/     # 已 claim
    done/<node>/
    failed/<node>/
  artifacts/<taskId>/
  relay.log
```

## 组件

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Cursor MCP  │     │  relay CLI   │     │   relayd    │
│ relay_send  │────►│  store.mjs   │◄────│  tick loop  │
│relay_receive│     └──────┬───────┘     └──────┬──────┘
└─────────────┘            │                     │
                    ~/.agent-relay/tasks/        spawn
                                          codex/hermes/agent/agy
```

### Core（`src/`）

- `sendTask` — 写 `pending/<to>/`
- `receiveTasks` — 列 `pending/<node>/`
- `claimTask` — pending → active

### relayd（`src/relayd.mjs`）

- 单实例 lock
- 轮询本机 node 的 pending `type=plan`
- 去重 → claim → 按 `nodes.yaml` provider spawn

### Providers

| provider | 唤醒 |
|----------|------|
| `codex-exec` | `codex exec ...` |
| `cursor-agent` | `agent --workspace ...` |
| `hermes-cli` | `hermes chat -q ...` |
| `antigravity-cli` | `agy -p ...` |
| `manual` | 不自动 spawn |

### MCP（`mcp/server.mjs`）

| Tool | 作用 |
|------|------|
| `relay_send` | 同 `relay send` |
| `relay_receive` | 同 `relay receive`，可选 claim |

### Setup（`scripts/setup.mjs`）

`relay setup --role sender|receiver|both` → nodes.yaml + MCP 合并 + launchd

## 典型序列

见 [E2E.md](E2E.md)。

## 与现有栈

| 现有 | agent-relay |
|------|-------------|
| Ruflo federation | **不依赖** |
| `~/.claude-flow/` | 可并存，独立 `AGENT_RELAY_HOME` |

## 安全

- 目录权限 `0700`，任务 JSON `0600`
- 任务不含密钥；`refs` 仅路径
