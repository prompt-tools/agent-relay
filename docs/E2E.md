# E2E：cursor → codex → cursor

v1 成功标准：**一条 send，无需手动开 Codex IDE，结果回到 `pending/cursor/`。**

## 前置

```bash
# 接收方（本机 Codex）
relay setup --role receiver --node codex

# 发送方（Cursor）
relay setup --role sender --node cursor

# 启动 daemon（setup 会写 launchd；也可手动）
relayd
```

## 流程

```mermaid
sequenceDiagram
  participant CC as Cursor
  participant FS as ~/.agent-relay
  participant RD as relayd
  participant CX as codex CLI

  CC->>FS: relay send codex (type=plan)
  RD->>FS: tick: claim plan
  RD->>CX: spawn codex exec
  CX->>CX: 执行任务
  CX->>FS: relay send cursor (type=result)
  CC->>FS: relay receive cursor --type result
```

## 手动验证步骤

```bash
# 1. 发送计划
relay send codex --from cursor --project ~/Projects/foo \
  --title "Fix login" --plan-text "## 步骤\n1. 修测试"

# 2. relayd 应 claim 并 spawn codex（需本机有 codex CLI）
relay status

# 3. 模拟回传（无 codex 时手动测链路）
relay send cursor --from codex --project ~/Projects/foo \
  --type result --task-id <上一步id> \
  --title Done --body '{"summary":"ok"}'

# 4. 发送方收取
relay receive cursor --type result
```

## 成功标准 Checklist

- [ ] `relay send` 写入 `~/.agent-relay/tasks/pending/codex/<id>.json`
- [ ] `relayd` 单实例运行（`relayd.pid` 存在）
- [ ] plan 被 claim 到 `active/codex/`
- [ ] codex provider spawn 命令含 `relay send cursor --type result`
- [ ] 回传出现在 `pending/cursor/`，`type=result`
- [ ] Cursor MCP `relay_receive` 能列出该任务
- [ ] `npm test` 全绿
