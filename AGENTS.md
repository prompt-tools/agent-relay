# AGENTS.md

给在本仓库工作的 AI Agent 的指引。

## 先读这些（顺序）

1. **`using-superpowers`** — 如何找技能、先 Read 再动手
2. **`docs/AGENT-CONTRACT.md`** — Superpowers + Cursor Subagent 绑定
3. `docs/PRINCIPLES.md` — 不可丢原则
4. `docs/MEMORY.md` / `docs/WORKLOG.md` — 项目记忆与进展

## 工作流（仅 Superpowers + Cursor Subagent）

| 阶段 | Superpowers 技能 | Cursor Subagent |
|------|------------------|-----------------|
| 新会话 | `using-superpowers` | — |
| 多 Task | `writing-plans` → `subagent-driven-development` | Implementer |
| 每 Task | `spec-reviewer-prompt.md` → `requesting-code-review` | `generalPurpose` → `code-reviewer` |
| 修 review | `receiving-code-review` | `gsd-code-fixer` |
| 完成 | `verification-before-completion` | 主 Agent 跑 `npm test` |
| 收尾 | `finishing-a-development-branch` | — |

细节与 Red Flags：**`docs/AGENT-CONTRACT.md`**

## 架构一句话

文件队列 `~/.agent-relay/tasks/pending/<node>/`；**send** / **receive**；**relayd** claim → spawn provider；回传 = 再次 **send**。

## 开发约束

- Node ≥20 ESM，零额外运行时依赖
- 改协议 → `schema.mjs` + 测试
- 新 provider → `src/providers/` + `relayd.mjs`
- CLI 与 MCP 同构（`store.mjs`）
- 默认 E2E：**cursor → hermes**

## 不要

- inbox/pull/complete、Ruflo 联邦、四 IDE 全家桶
- 跳过双阶段 Subagent 审查
- 无 fresh `npm test` 说完成
- 主 Agent 自己写大 diff

## 常用命令

```bash
npm test
node bin/relay.js setup --role receiver --node hermes --yes
node bin/relay.js send hermes --from cursor --project . --title T --plan-text "## ..."
node bin/relay.js receive cursor --type result
node bin/relay.js watch --once
node bin/relay.js serve
```
