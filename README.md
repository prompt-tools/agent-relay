# agent-relay

本机 Agent 任务邮政局：**发 → 自动唤醒执行方 → 再发回来**。

## 典型流程

```
Cursor  relay send codex     →  pending/codex/
relayd  claim + spawn codex  →  codex exec ...
codex   relay send cursor    →  pending/cursor/ (type=result)
Cursor  relay receive cursor →  读取结果
```

## 快速开始

```bash
cd ~/Projects/agent-relay
npm test

# 一次性配置
node bin/relay.js setup --role both --node cursor
# 或分拆：发送方 --role sender，接收方 --role receiver --node codex

# 发送任务
node bin/relay.js send codex --from cursor --project ~/Projects/foo \
  --title "示例" --plan-text "## 步骤\n1. ..."

# 收取回传
node bin/relay.js receive cursor --type result
```

## MCP（Cursor）

`relay setup` 会合并 `~/.cursor/mcp.json`。也可手动添加：

```json
{
  "mcpServers": {
    "agent-relay": {
      "command": "node",
      "args": ["/path/to/agent-relay/mcp/server.mjs"]
    }
  }
}
```

工具：`relay_send`、`relay_receive`

## 文档

| 文件 | 内容 |
|------|------|
| [docs/PRINCIPLES.md](docs/PRINCIPLES.md) | 不可丢原则 |
| [docs/FOCUS.md](docs/FOCUS.md) | v1 范围 |
| [docs/E2E.md](docs/E2E.md) | E2E 流程与成功标准 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 组件与数据流 |
| [docs/TASK-SCHEMA.md](docs/TASK-SCHEMA.md) | 任务信封 |

## 可靠性

- 原子写盘 + rename claim
- relayd 单实例 + 去重
- 详见 [docs/RELIABILITY.md](docs/RELIABILITY.md)

## 状态

**v1**：协议、relayd、setup、MCP 已实现；E2E 需本机 codex CLI 实测。

## License

MIT
