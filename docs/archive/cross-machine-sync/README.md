# 跨机同步 — 封存

> **状态：封存（2026-06-07）** — 本机 E2E 验证通过前 **不实现、不排期**。  
> 调研 / 设计 / 计划已写好，恢复时从本目录索引继续。

## 为何封存

- 当前仅 **单机自用**；v1 假设（同卷 rename claim、本机 relayd、processed 去重）已在本机跑通。
- 跨机无「原样挂载 `~/.agent-relay`」方案；实现前必须先确认本机闭环稳定。

## 恢复条件（满足后再开）

1. `docs/E2E.md` checklist 在本机 **可重复通过**（含 MCP 路径）。
2. `relay health` 长期无 stuckActive / 重复 wake。
3. 用户明确需要 **第二台固定开发机** 自动闭环。

## 文档索引（勿删，恢复时用）

| 文档 | 用途 |
|------|------|
| [调研](../../research/2026-06-07-cross-machine-sync.md) | 业界方案、局限、选项 A–D |
| [设计](../../superpowers/specs/2026-06-07-cross-machine-sync-design.md) | 推荐 B→A，`relay sync` 契约 |
| [实现计划](../../superpowers/plans/2026-06-07-phase3-sync-rsync.md) | Phase 3a Task 1–4（未开工） |

## 恢复流程

按 `docs/AGENT-CONTRACT.md` §0.1：**审计划 → 实现 → 双审查 → `npm test`**。  
不必重跑调研，除非协议或 `store.mjs` claim 语义已变。
