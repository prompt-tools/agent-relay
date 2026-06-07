# 文档全目录索引

> agent-relay · HEAD `0ba83cc` · 路径均相对仓库根

## 交接专用（本目录）

| 路径 | 说明 |
|------|------|
| `docs/handoff/README.md` | 交接入口 |
| `docs/handoff/SESSION-SNAPSHOT.md` | 会话状态快照 |
| `docs/handoff/INDEX.md` | 本文件 |
| `docs/handoff/EXTERNAL-PATHS.md` | 仓库外路径 |
| `docs/handoff/agent-relay-handoff-2026-06-07.tar.gz` | 完整打包 |

---

## 根目录

| 路径 | 说明 |
|------|------|
| `README.md` | 项目简介、MCP、文档表、v0.3.0 状态 |
| `AGENTS.md` | Agent 入口指针 → CONTRACT |
| `CHANGELOG.md` | 版本变更（含 0.3.0） |
| `.cursor/rules/agent-relay.mdc` | Cursor 仓库规则（alwaysApply） |

---

## docs/ — 核心（先读这些）

| 路径 | 说明 |
|------|------|
| `docs/AGENT-CONTRACT.md` | **编排真源**：S/M/L、Research-First 九步、Hermes §0.3、Subagent 表 |
| `docs/MEMORY.md` | **项目记忆**：决策、踩坑、审计 Batch 状态、维护态 |
| `docs/PRINCIPLES.md` | 产品原则、明确不做 |
| `docs/WORKLOG.md` | 按日进展 + 决策日志 + 验证命令 |
| `docs/FOCUS.md` | 当前聚焦、已否决方向、成功标准 |
| `docs/ROADMAP.md` | Phase 0–3 勾选；跨机封存 |
| `docs/OPERATIONS.md` | 日常运维一页纸 + CLI 分层 |
| `docs/PROMPTS.md` | send/receive/hermes 话术 v2 |
| `docs/CURSOR-MEMORY.md` | 建议粘贴到 Cursor 用户级 Memory 的段落 |

---

## docs/ — 技术参考

| 路径 | 说明 |
|------|------|
| `docs/ARCHITECTURE.md` | 模块与数据流 |
| `docs/TASK-SCHEMA.md` | 任务 JSON 信封 |
| `docs/SETUP.md` | 安装、OAuth、launchd |
| `docs/E2E.md` | E2E 流程与 smoke |
| `docs/RELIABILITY.md` | 幂等、重试、recover、gc |
| `docs/VISION.md` | 愿景（部分待对齐） |

---

## docs/research/ — 调研

| 路径 | 说明 |
|------|------|
| `docs/research/2026-06-07-local-e2e-acceptance.md` | 本机 E2E 验收调研 |
| `docs/research/2026-06-07-cross-machine-sync.md` | 跨机同步调研（封存） |
| `docs/research/2026-06-07-full-repo-audit.md` | 全仓审计报告；Batch 1/2 ✅ Batch 3 ⏸ |

---

## docs/superpowers/specs/ — 设计

| 路径 | 说明 |
|------|------|
| `docs/superpowers/specs/2026-06-07-local-e2e-acceptance-design.md` | E2E 验收设计 |
| `docs/superpowers/specs/2026-06-07-cross-machine-sync-design.md` | 跨机设计（封存） |

---

## docs/superpowers/plans/ — 实现计划

| 路径 | 说明 |
|------|------|
| `docs/superpowers/plans/2026-06-06-agent-relay-v1.md` | v1 初版计划 |
| `docs/superpowers/plans/2026-06-07-agent-relay-v1-finish.md` | v1 收尾 |
| `docs/superpowers/plans/2026-06-07-local-e2e-acceptance.md` | E2E 验收计划（已落地） |
| `docs/superpowers/plans/2026-06-07-phase3-antigravity-provider.md` | antigravity provider |
| `docs/superpowers/plans/2026-06-07-phase3-relay-serve.md` | relay serve 面板 |
| `docs/superpowers/plans/2026-06-07-phase3-sync-rsync.md` | 跨机 rsync（封存） |

---

## docs/archive/ — 封存

| 路径 | 说明 |
|------|------|
| `docs/archive/cross-machine-sync/README.md` | 跨机封存说明 + 恢复条件 + 文档索引 |

---

## 代码入口（实现时）

| 路径 | 说明 |
|------|------|
| `bin/relay` | CLI 入口 |
| `lib/store.mjs` | 任务存储 hub |
| `lib/relayd.mjs` | 守护进程 + provider spawn |
| `lib/providers/*.mjs` | hermes / cursor / codex / antigravity |
| `mcp/server.mjs` | MCP relay_send / relay_receive |
| `test/*.mjs` | 62 项单元/E2E 测试 |
| `config.example.json` | 配置示例 |

---

## 阅读顺序建议

### 接替 Agent（5 分钟）

1. `docs/handoff/SESSION-SNAPSHOT.md`
2. `docs/AGENT-CONTRACT.md` §0.1 + §0.3
3. `docs/MEMORY.md`
4. `docs/WORKLOG.md` 最后 3 节

### 做新功能（L 档）

1. `docs/PRINCIPLES.md` + `docs/FOCUS.md`
2. CONTRACT §0.2 九步 → research → spec → plan
3. `docs/ARCHITECTURE.md` + CodeGraph MCP

### 日常运维

1. `docs/OPERATIONS.md`
2. `docs/E2E.md`
3. `docs/PROMPTS.md`
