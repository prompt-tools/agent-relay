# Worklog

按时间记录 agent-relay 开发进展。格式：日期 · 摘要 · 证据。

---

## 2026-06-07 — v1 骨架 + Hermes E2E

**目标**：本机 Agent 任务邮政局（send → relayd 唤醒 → send 回传）。

**完成**：
- 对称协议 v2（`type` + `projectPath`，废弃 inbox）
- `relayd` 单实例 + claim + provider spawn
- `hermes-cli` / `codex-exec` provider
- MCP：`relay_send` / `relay_receive`
- `relay setup`（角色、MCP 合并、launchd）
- **实测** cursor→hermes：`HELLO RELAY` 回传成功

**测试**：`npm test` → 17 tests（后增至 22）

**提交**：
- `d239e5a` v1 协议/relayd/setup/MCP
- `7d7de69` hermes-cli provider

---

## 2026-06-07 — v1 收尾

**完成**：
- `scripts/auth.mjs` — 按角色 OAuth（hermes login）
- 交互式 `relay setup` + `launchctl bootstrap`
- `src/project.mjs` — `project.yaml` 默认路由
- `docs/SETUP.md`、更新 `E2E.md`（Hermes 主路径）
- relayd 失败写 `relay.log`（`relayd_error`）

**测试**：22/22 pass

**提交**：见 `feat: v1 finish` 批次

---

## 2026-06-07 — GitHub 发布 + 正式环境 + health

**完成**：
- push main + `v0.1.0` tag + [GitHub Release](https://github.com/prompt-tools/agent-relay/releases/tag/v0.1.0)
- `relay health` / `relay status --health`
- `~/.agent-relay` 正式 setup（receiver hermes + sender cursor MCP）
- **修复** launchd `spawn hermes ENOENT` → nodes.yaml 绝对路径 + plist PATH
- **正式 E2E 成功**：`PROD2 OK` 回传到 `pending/cursor/`

**测试**：27/27 pass

---

## 2026-06-07 — 项目记忆与 GitHub 基建

**完成**：
- `docs/MEMORY.md` — 项目级记忆（决策、踩坑、索引）
- `docs/WORKLOG.md` — 本文件
- `docs/CURSOR-MEMORY.md` — 用户级 Cursor Memory 粘贴建议
- `AGENTS.md` + `.cursor/rules/agent-relay.mdc`
- `CHANGELOG.md`, `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/`
- 更新 `ROADMAP.md`、`README.md`

---

## 2026-06-07 — Phase 2：provider + 重试 + recover

**完成**：
- `src/providers/cursor.mjs` — `agent --workspace --print --force --approve-mcps`
- `relayd` 失败重试：`relayd.retries.json`，最多 3 次；spawn 成功才写 processed
- `handleWakeFailure` — recover + 清除 processed（修复竞态卡死）
- `src/recover.mjs` + `relay recover` CLI
- `relaySendInstruction` shell 引号（空格路径安全）
- 代码审查修复：`recoverTask` 回写磁盘、`recover --older-than` remaining 计数

**测试**：32/32 pass

**提交**：Phase 2 批次（见 git log）

---

## 2026-06-07 — 上下文预算 + v0.2.0 发布

**完成**：
- `AGENTS.md` / `.cursor/rules` — 上下文 >75% 自动落盘 + handoff 协议
- GitHub Release **v0.2.0**

---

## 2026-06-07 — Phase 2 收尾 + 编排模式

**完成**（subagent 实现，主 Agent 编排）：
- `relay watch` — progress/active/log 终端面板
- setup TUI — 编号菜单 + y/n 确认
- 编排模式写入 `AGENTS.md` / Cursor rules
- 审查 LOW 修复：watch SIGTERM、active 字段 fallback

**测试**：45/45 pass（含 watch emit try/catch）

---

## 2026-06-07 — Phase 3 Task 1: antigravity-cli

**完成**（subagent 实现 + 双审查）：
- `src/providers/antigravity.mjs` — `agy -p` + `--dangerously-skip-permissions`
- 注册 `relayd.mjs`；tick 集成测试

**测试**：50/50 pass

---

## 2026-06-07 — 跨机同步：Research-First 流程

**完成**：
- 调研 `docs/research/2026-06-07-cross-machine-sync.md`（balls/GNAP/rsync/NFS/broker/Syncthing）
- 设计 `docs/superpowers/specs/2026-06-07-cross-machine-sync-design.md`（推荐 B→A）
- 实现计划 `docs/superpowers/plans/2026-06-07-phase3-sync-rsync.md`
- `AGENT-CONTRACT.md` §0.1 Research-First 全链路
- 调研/设计 Subagent 审查 WARN → 已修订

**决定**：跨机 **封存**，本机 E2E 验收优先 → `docs/archive/cross-machine-sync/README.md`

---

## 2026-06-07 — 本机 E2E 验收（Research-First）

**链路**：调研 → 审 → 设计 → 审 → 计划 → 实现 → `npm test` **60/60**

**完成**：
- `archivePlanOnResult`（result → plan 进 `done/`）
- `relay gc` + health `orphanPendingPlans`
- `test/e2e-relayd.test.mjs` relayd 闭环
- 文档：E2E / RELIABILITY v2 对齐 / ROADMAP

**生产**：`relay gc --yes` 清理历史 orphan pending；**live smoke PROD3 OK** ~12s

---

## 2026-06-07 — live smoke + relay smoke CLI

- 实测：plan `20260607-110837-3bee` → result `PROD3 OK` → `done/hermes/` 归档
- 新增 `relay smoke` 可重复 live 验收
- `npm test` 62/62

---

**完成**（subagent + 双审查）：
- `src/serve.mjs` — `/api/watch`, `/api/health`, 内联 HTML 仪表盘
- `relay serve --host --port`；修复 async run().catch

**测试**：54/54 pass

---

**决策**：用户卸载 GSD/OMX；`AGENT-CONTRACT.md` 只绑定 Superpowers 技能与 Cursor Subagent 类型。

---

**完成**：
- `docs/AGENT-CONTRACT.md` — 用户要点 → MUST/MUST NOT、双阶段审查、完成门槛、会话自检
- 精简 `AGENTS.md` + 强化 `.cursor/rules/agent-relay.mdc`

---

**完成**：
- `AGENTS.md` + `.cursor/rules/agent-relay.mdc` — 上下文 >75% 时自动落盘/收窄/handoff
- `docs/MEMORY.md` 记录用户决策

**触发信号**：conversation summary、跨 Phase、重复扫 transcript

---

## 2026-06-07 — Hermes 执行 v0.3.0 prep

**完成**：
- `package.json` 版本 → `0.3.0`
- `CHANGELOG.md` [Unreleased] → `[0.3.0] - 2026-06-07`（antigravity-cli、relay serve/smoke/gc、e2e-relayd、archivePlanOnResult）
- 更新 compare 链接（v0.3.0）

---

## 决策日志

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-06-07 | E2E 主路径改 hermes | 用户无 codex 额度 |
| 2026-06-07 | nodes.yaml 用 JSON 非 YAML | v1 零依赖 |
| 2026-06-07 | 技能驱动：writing-plans + subagent-driven-development | 用户要求规范流程 |

---

## 验证命令

```bash
npm test
AGENT_RELAY_HOME=/tmp/agent-relay-hermes-e2e relay setup --role receiver --node hermes --no-mcp --no-launchd
# 见 docs/E2E.md 完整流程
```
