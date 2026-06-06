# Roadmap

## Phase 0 — 研究定稿 ✅

- [x] 需求整合（CC 计划 → Hermes 执行 → 回传 CC）
- [x] 否决联邦作为主路径
- [x] 目录与 JSON schema
- [x] [RELIABILITY.md](RELIABILITY.md) 稳定 / 多系统原则

## Phase 1 — 最小可用（MVP）🚧 当前

- [x] `src/` Node core：原子写、rename 认领、send/claim/complete/pull
- [x] `bin/relay` CLI
- [x] `relay init` → `~/.agent-relay/config.json`
- [x] 四节点：`cursor codex hermes antigravity`
- [x] `docs/PROMPTS.md`
- [x] `node --test` 基础流程测试
- [ ] 本机四 IDE 各跑通一条真实任务
- [ ] GitHub `prompt-tools/agent-relay` 发布

**验收**：CC send → Hermes claim/complete → CC pull，无 Docker。

## Phase 2 — Cursor 集成

- [ ] 轻量 MCP server（stdio），暴露 `relay_send` / `relay_pull` / `relay_list`
- [ ] 文档：`~/.cursor/mcp.json` 片段
- [ ] 可选：与 `ruflo memory` 联动（complete 时写 memory key）

## Phase 3 — 半自动唤醒

- [ ] `relay watch hermes` — fswatch pending + macOS 通知
- [ ] 探测 Hermes/Codex 可用 CLI，文档化一键 `claim`

## Phase 4 — 可选 UI

- [ ] 飞书单 Bot：仅 `send` + 通知，不替代 relay 目录
- [ ] 或 Slack / Discord adapter（参考 WAAAH 模式）

## 不做

- Ruflo federation 插件复刻
- 多机 NAT / WireGuard
- 复杂 DAG 编排（需要时再对接 Gas Town / agent-orchestration）
