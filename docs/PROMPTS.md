# 各 IDE 固定话术

> 对应 agent-relay v2：`send` / `receive` 文件队列 + `relayd` claim + `archivePlanOnResult`。

## Hermes（执行方）

```
你是执行 Agent。请：
1. relay receive hermes          — 列出 pending/hermes/ 最新任务
2. relay claim hermes <id>       — 认领（移到 active/；通常 relayd 自动 claim）
3. 按 plan.markdown 与 acceptance 完成
4. relay send cursor --project . --type result --task-id <id> --title Done --body '{"summary":"…"}'
   — 结果写入 pending/cursor/，plan 自动归档到 done/
```

## Cursor / CC（计划方 · 发送 / 收回传）

**派发：**

```
relay send hermes --project . --title "任务标题" --plan-text "## 步骤…"
（或 MCP relay_send）
```

**收回传：**

```
relay receive cursor --type result
读 pending/cursor/ 最新 result.json，继续下一步计划。
```

## Codex / Antigravity

将路径中的 `hermes` 换成 `codex` 或 `antigravity` 即可。

## 关键路径

```
pending/<to>/<id>.json   ← send 写入
active/<to>/<id>.json    ← claim 移动
done/<to>/<id>.json      ← archivePlanOnResult 归档
pending/<from>/<id>.json ← result send 写回
```
