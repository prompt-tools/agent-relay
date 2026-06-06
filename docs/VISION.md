# Vision

## 问题

用户在 Cursor 里做好计划，希望**无感**派给 Hermes/Codex 等执行，做完自动回传——而不是四个 IDE 轮流打开、轮流贴提示词。

## 目标（v1）

1. **send → relayd 唤醒 → 执行 → send 回传**
2. 一次 `relay setup`（角色 + CLI 检测 + MCP + launchd）
3. 发送方只认逻辑节点名；接收方自选 wake provider
4. CLI + MCP + relayd 同构，读同一份 `~/.agent-relay`

## 非目标（v1）

- Ruflo 联邦 / Hub / peer mesh
- inbox / pull / complete 不对称链路
- Docker 门面、跨机同步
- 四 provider 齐测、Web 面板

## 成功标准

见 [E2E.md](E2E.md) checklist：一条 `relay_send` → 结果出现在 `pending/cursor/` 的 `type:result` 任务。

## 产品路径

`relay setup` → `relayd` → `relay send/receive` → 后加 TUI/Web 面板
