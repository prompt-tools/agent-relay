# 各 IDE 固定话术

复制到对应 Agent 会话即可，无需记命令细节。

## Hermes（执行方）

```
你是执行 Agent。请：
1. 列出 ~/.agent-relay/tasks/pending/hermes/ 最新任务（或运行 relay list hermes）
2. relay claim 该任务（或手动读 plan.json 的 plan.markdown）
3. 按 acceptance 完成
4. relay complete <id> --summary <摘要路径>
5. 确认 ~/.agent-relay/inbox/cursor/ 已生成 result.json
```

## Cursor / CC（计划方 · 收回报）

**派发：**

```
用 relay send hermes --plan <文件或正文> --title "任务标题"
（或 MCP relay_send）
```

**收结果：**

```
relay pull cursor
读 inbox/cursor/ 最新 result.json 与 artifacts/ 目录，继续下一步计划。
```

## Codex / Antigravity

将路径中的 `hermes` 换成 `codex` 或 `antigravity` 即可。
