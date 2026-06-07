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

**审查**：第三方 code-reviewer **APPROVE WITH NOTES**（`91aca8b..2eda295`）；补 ROADMAP v0.3.0 + CHANGELOG Fixed 后发布 tag

---

## 2026-06-07 — v0.3.0 发布 + 文档对齐

- GitHub Release [v0.3.0](https://github.com/prompt-tools/agent-relay/releases/tag/v0.3.0)
- AGENT-CONTRACT §0.3：Hermes 派活 + 第三方审查 + **无需用户逐步确认**
- README / FOCUS / VISION / E2E checklist 与现状对齐

---

## 2026-06-07 — 全仓库审计 + Batch 1/2 收尾

**CodeGraph**：`codegraph init`（392 nodes）；`.codegraph/` 入 gitignore。

**审计**：`docs/research/2026-06-07-full-repo-audit.md`；3 Subagent + Hermes Batch 1（`1679ebb` → review → `2b045dd`）。

**Batch 2**：
- CONTRACT **S/M/L**（§0.1）；Research-First 仅 L 档
- AGENTS.md / cursor rule 瘦身为指针
- **MEMORY.md** 全量同步（审计、CodeGraph、档位、维护态）

**测试**：62/62

---

## 2026-06-07 — 审计 Batch 3：deprecated stub + relayLog 合并

**完成**（S 档，Hermes 接手）：
- 删除 `bin/relay.js` 中 `relay pull|complete|fail` deprecated stub + `deprecated()` 函数
- `appendLog`（store.mjs）+ `relayLog`（relayd.mjs）→ 统一 `src/log.mjs`
- `store.mjs` / `relayd.mjs` 改为 `import { appendLog } from './log.mjs'`

**测试**：62/62

---

## 2026-06-07 — v0.4.0 发布准备

**完成**（S 档）：
- package.json version bump 0.3.0 → 0.4.0
- CHANGELOG.md 填写 [0.4.0] 条目（P0+P1 distribution readiness + audit batches 1/2/3 归纳）

**待办**：npm org 创建 + NPM_TOKEN 配置后方可 publish。

---

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-06-07 | E2E 主路径改 hermes | 用户无 codex 额度 |
| 2026-06-07 | nodes.yaml 用 JSON 非 YAML | v1 零依赖 |
| 2026-06-07 | 技能驱动：writing-plans + subagent-driven-development | 用户要求规范流程 |
| 2026-06-07 | CONTRACT S/M/L 档位 | 全仓审计：九步对小改过重 |
| 2026-06-07 | CodeGraph 本地索引 | MCP 查询；`.codegraph/` 入 gitignore |
| 2026-06-07 | npm 包名 @prompt-tools/agent-relay | agent-relay 被占 |

---

## 2026-06-07 — P0 分发就绪度

**审计**：sub-agent 审计发现 5/6 FAIL（npm 包名被占、无 files 字段、零跨平台检查、README 内部向、无 CI、版本硬编码）。

**完成**（plan → review → execute → review → fix → re-review）：
- `@prompt-tools/agent-relay` scoped 包名
- `package.json` 加 `files`、`author`、`repository`、`homepage`、`bugs`
- `command -v` → `which`/`where`（setup.mjs）
- launchd platform guard（setup.mjs + launchd.mjs）
- README 英文化 + docs/README-zh.md
- MCP 版本动态读取（readFileSync + JSON.parse）
- docs/README-zh.md 链接修正

**审查**：两轮 sub-agent review，APPROVE。
**测试**：62/62

---

## 2026-06-07 — P1 分发就绪度

**完成**（plan → review → fix → re-review → execute → review → push）：
- `.github/workflows/ci.yml` — Node 20/22 × macOS/Ubuntu，timeout-minutes:10，npm cache
- `.github/workflows/publish.yml` — release 触发，`npm publish --access public`，NPM_TOKEN
- JSDoc：8 个 src 文件共 74 个 @param 标签
- README.md 新增「Optional CLI Agents」表（hermes/cursor-agent/codex/antigravity）

**审查**：两轮 sub-agent review，APPROVE。
**测试**：62/62

---

## 验证命令

```bash
npm test
AGENT_RELAY_HOME=/tmp/agent-relay-hermes-e2e relay setup --role receiver --node hermes --no-mcp --no-launchd
# 见 docs/E2E.md 完整流程
```
