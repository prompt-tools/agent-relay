# agent-relay

跨 IDE / 跨 CLI / 跨 Agent 的轻量任务中继系统。

**目标**：配置简单，让 Cursor（CC）把计划派给 Hermes 等执行方，执行完成后把产物回传给 CC——不依赖 Ruflo 联邦 Hub。

## 典型流程

```
Cursor (计划)  →  dispatch send hermes  →  pending/
Hermes (执行)  →  dispatch complete     →  done/ + artifacts/
Cursor (汇总)  →  dispatch pull cursor  →  读取产物继续
```

## 文档

| 文件 | 内容 |
|------|------|
| [docs/VISION.md](docs/VISION.md) | 问题、目标、非目标 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 组件、数据流、与现有栈关系 |
| [docs/TASK-SCHEMA.md](docs/TASK-SCHEMA.md) | 任务信封 JSON 约定 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 分阶段实现计划 |

## 快速开始

```bash
cd ~/Projects/agent-relay
node bin/relay.js init --as cursor
node bin/relay.js send hermes --from cursor --title "示例" --plan-text "## 步骤\n1. ..."
# Hermes 侧：claim → complete
node bin/relay.js claim hermes
node bin/relay.js complete hermes <taskId> --summary "完成"
# Cursor 收结果
node bin/relay.js pull cursor
```

## 可靠性

- 原子写盘 + rename 认领，防双占、防半截 JSON
- 零 Docker / 零联邦 peer，**单目录 `~/.agent-relay` 跨 IDE/CLI 共用**
- 详见 [docs/RELIABILITY.md](docs/RELIABILITY.md)

## 状态

**Phase 1（当前）**：CLI 核心可用，MCP / 飞书后续。

## 与本机环境

- 任务根目录默认：`~/.agent-relay/`（可 `AGENT_RELAY_HOME` 覆盖）
- 与 `~/.claude-flow/` 共享记忆可并存，不替代 ruflo memory
- 节点名：`cursor` | `codex` | `hermes` | `antigravity`

## License

MIT
