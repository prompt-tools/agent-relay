# agent-relay

本机 Agent 任务邮政局：**Cursor 发 plan → relayd 唤醒 Hermes → 做完 send 回传**。

当前版本：**v0.3.0** · [Release notes](https://github.com/prompt-tools/agent-relay/releases/tag/v0.3.0)

## 典型流程（主路径 cursor → hermes）

```
Cursor  relay send hermes     →  pending/hermes/
relayd  claim + hermes chat   →  active/hermes/
hermes  relay send cursor     →  pending/cursor/ (type=result)
        plan 归档              →  done/hermes/
Cursor  relay receive cursor  →  读取结果
```

## 快速开始

```bash
cd ~/Projects/agent-relay
npm test

# 接收方（Hermes + relayd）
relay setup --role receiver --node hermes --yes

# 发送方（Cursor MCP）
relay setup --role sender --node cursor --yes
# 重启 Cursor

# 发任务（本仓库已配 .agent-relay/project.yaml → defaultTo hermes）
relay send --project . --title "任务" --plan-text "## 步骤\n..."

# 验收
relay health
relay smoke --project .          # live 全链路，约 10–30s
relay receive cursor --type result
```

## 常用命令

| 命令 | 作用 |
|------|------|
| `relay watch --once` | 队列 / active / 日志快照 |
| `relay serve` | 本机面板 http://127.0.0.1:3847 |
| `relay gc --yes` | 清理 processed 孤儿 pending |
| `relay recover hermes` | 卡住任务回 pending |

## MCP（Cursor）

`relay setup` 合并 `~/.cursor/mcp.json`。工具：`relay_send`、`relay_receive`

## 文档

| 文件 | 内容 |
|------|------|
| [docs/AGENT-CONTRACT.md](docs/AGENT-CONTRACT.md) | Agent 工作契约（含 Hermes 派活 + 第三方审查） |
| [docs/E2E.md](docs/E2E.md) | E2E 与 smoke |
| [docs/SETUP.md](docs/SETUP.md) | 安装与 OAuth |
| [docs/PRINCIPLES.md](docs/PRINCIPLES.md) | 原则 |
| [docs/MEMORY.md](docs/MEMORY.md) | 踩坑与决策 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更 |

## 状态

- **v0.3.0**：本机 E2E 已验收（CI `e2e-relayd` + live `relay smoke` PROD3 OK）
- **跨机同步**：封存，见 `docs/archive/cross-machine-sync/`

## License

MIT
