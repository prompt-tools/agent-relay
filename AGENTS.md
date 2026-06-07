# AGENTS.md

给在本仓库工作的 AI Agent 的指引。

## 先读这些（顺序）

1. `docs/PRINCIPLES.md` — 不可丢原则
2. **`docs/AGENT-CONTRACT.md`** — **硬约束与审查门槛（必读）**
3. `docs/FOCUS.md` — v1 范围与已否决方向
4. `docs/MEMORY.md` — 项目经验与踩坑
5. `docs/WORKLOG.md` — 最近做了什么

## 架构一句话

文件队列 `~/.agent-relay/tasks/pending/<node>/`；**send** 写入，**receive** 列出；**relayd** 见 plan → claim → spawn provider CLI；回传 = 再次 **send**（`type:result`）。

## 开发约束

- Node ≥20 ESM，无额外运行时依赖
- 改协议先改 `src/schema.mjs` + 测试
- 新 provider 放 `src/providers/`，注册到 `src/relayd.mjs`
- CLI 与 MCP 必须同构（共用 `src/store.mjs`）
- 每步 `npm test`；声称完成前要有测试证据

## 默认 E2E

**cursor → hermes**（不是 codex，除非用户明确要求）。

## 工作流（摘要 → 细节见 AGENT-CONTRACT.md）

**原则：约束绑定已有技能，不另起炉灶。执行前先 Read 对应 SKILL.md。**

| 阶段 | Read 技能 | 派 subagent |
|------|-----------|-------------|
| 多步功能 | `writing-plans` | — |
| 每 Task 执行 | `subagent-driven-development` | `gsd-executor` + **implementer-prompt.md** |
| 规格审查 | `spec-reviewer-prompt.md` | `generalPurpose` |
| 质量审查 | `requesting-code-review` | `code-reviewer`（带 BASE/HEAD SHA） |
| 声称完成 | `verification-before-completion` | fresh `npm test` |
| 上下文满 | `handoff` + MEMORY/WORKLOG | — |

完整映射（Superpowers / GSD / OMX）：**`docs/AGENT-CONTRACT.md`**

## 不要

- 恢复 inbox/pull/complete
- 引入 Ruflo 联邦为主路径
- 扩 scope 到四 provider 齐测 / Docker / 跨机
- 跳过测试、跳过双阶段审查、或 memory/worklog 更新
- 一次 code-review 糊弄多个 Task

## 常用命令

```bash
npm test
node bin/relay.js setup --role receiver --node hermes --yes
node bin/relay.js send hermes --from cursor --project . --title T --plan-text "## ..."
node bin/relay.js receive cursor --type result
node bin/relay.js watch --once
```
