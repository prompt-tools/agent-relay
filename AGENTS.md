# AGENTS.md

给在本仓库工作的 AI Agent 的指引。

## 先读这些

1. `docs/PRINCIPLES.md` — 不可丢原则
2. `docs/FOCUS.md` — v1 范围与已否决方向
3. `docs/MEMORY.md` — 项目经验与踩坑
4. `docs/WORKLOG.md` — 最近做了什么

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

## 技能流程

多步任务：
1. `writing-plans` → `docs/superpowers/plans/`
2. `subagent-driven-development` 执行
3. `verification-before-completion` 再声称完成

## 上下文预算（>75% 时自动执行）

无法精确读取消耗百分比时，用以下**代理信号**判断「该精简了」：

- 系统注入了 conversation summary（上下文已被压缩过）
- 同一任务已跨很多轮，且大量 tool 输出仍在记忆里
- 刚完成一个 Phase / 大 feature，即将开始新主题
- 重复读取 transcript、全文件或长 diff 才能继续

**精简协议**（按顺序，不要跳步）：

1. **落盘** — 只把*新*决策/踩坑写入 `docs/MEMORY.md`，进展写入 `docs/WORKLOG.md`；不重复已有 plan/ADR 全文，用路径引用
2. **提交** — 若有未提交的有意义改动，先 commit（用户已授权自主推进时）
3. **收窄注意力** — 之后优先读 `MEMORY` / `WORKLOG` / `ROADMAP` / 相关 plan，**禁止**再扫完整 transcript 或批量重读已定论文件
4. **交接** — 若 summary 已发生或会话明显过长：用 `handoff` 技能写一份短交接（存 OS 临时目录），列出「下一步 + 建议技能」
5. **表达** — 对用户回复保持简短；代码用 `startLine:endLine:path` 引用，不粘贴大段已有内容

**不要**用 `caveman` 做上下文管理（那是沟通风格，不是记忆整理）。

## 不要

- 恢复 inbox/pull/complete
- 引入 Ruflo 联邦为主路径
- 扩 scope 到四 provider 齐测 / Docker / 跨机
- 跳过测试或 memory/worklog 更新

## 常用命令

```bash
npm test
node bin/relay.js setup --role receiver --node hermes --yes
node bin/relay.js send hermes --from cursor --project . --title T --plan-text "## ..."
node bin/relay.js receive cursor --type result
```
