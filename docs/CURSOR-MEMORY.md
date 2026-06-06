# Cursor 用户 Memory 建议

> 将下面段落添加到 Cursor **Settings → Rules / Memories**（用户级），跨项目生效。

---

**agent-relay 项目**（`~/Projects/agent-relay`）：

- 本机 Agent 任务邮政局：对称 `send/receive`，无 inbox。
- **主 E2E：cursor → hermes**（用户无 codex 额度，默认不用 codex）。
- 开发前先读 `docs/PRINCIPLES.md`、`docs/MEMORY.md`、`docs/WORKLOG.md`。
- 多步任务用技能：`writing-plans` → `subagent-driven-development`，每步 `npm test`。
- 唤醒靠 `relayd` + provider；Hermes 用 `hermes chat -q -Q --accept-hooks --yolo`。
- 不要恢复 Ruflo 联邦、四 IDE 全家桶 setup、或 pull/complete 旧协议。

---

项目内已有 `.cursor/rules/agent-relay.mdc`（仅在本仓库打开时自动生效）。
