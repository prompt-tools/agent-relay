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
