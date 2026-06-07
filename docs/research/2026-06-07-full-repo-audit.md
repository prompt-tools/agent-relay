# 全仓库审计报告

> 日期：2026-06-07  
> 方法：CodeGraph 索引（44 文件 / 392 nodes）+ 3 路 Cursor Subagent + codegraph_explore  
> 性质：**只读审计**；清理项由 Hermes 执行 + code-reviewer 再审

---

## 执行摘要

| 维度 | 结论 | 优先级 |
|------|------|--------|
| **架构** | 清晰：CLI/MCP → store → relayd → providers；hub 为 `store.mjs` | 低（结构 OK） |
| **死代码** | 无整块废弃模块；`pull/complete/fail` 为 intentional stub | 低 |
| **文档漂移** | **`PROMPTS.md` 仍 v1 inbox/complete** — 高风险 | **P0** |
| **无效配置** | `config.example.yaml` 无 loader | **P1** |
| **元数据** | MCP `SERVER_INFO.version` 0.1.0 vs package 0.3.0 | **P1** |
| **工作流** | Research-First 九步对小改过重；建议 S/M/L 分档 | 文档/契约 P2 |
| **CLI** | 14 命令合理；建议文档分 Daily/Ops/Advanced | P2 |

CodeGraph：项目根已 `codegraph init`；Cursor MCP `user-codegraph` 可查询。索引目录 `.codegraph/` 本地生成，**不入 git**。

---

## 1. 架构（Evidence）

```
bin/relay.js ──► src/store.mjs ◄── mcp/server.mjs
                      ▲
bin/relayd.js ──► src/relayd.mjs ──► providers/*.mjs
```

- **耦合热点**：`store.mjs` 单点；`relayd.mjs` PROVIDERS 硬编码表（新 provider 必改两处）
- **重复**：`appendLog` vs `relayLog` 双写 `relay.log`
- **命名**：`nodes.yaml` 实际 JSON.parse

---

## 2. 死命令 / 死代码

### 确定

| 项 | 说明 |
|----|------|
| `relay pull\|complete\|fail` | 仅 `deprecated()` stub，有意保留 |
| `config.example.yaml` | 无引用；应为 `config.json` 示例或删除 |

### 非死（勿删）

- 全部 `src/*.mjs` 有 import 链
- codex provider 为可选节点，非默认 E2E

### 可收紧（非必须）

- `store.mjs` 等 7 个 export 仅本文件使用

---

## 3. 文档漂移（P0–P1）

| 文件 | 问题 |
|------|------|
| **`docs/PROMPTS.md`** | complete/pull/inbox — **与 v2 冲突，Hermes 若读此会做错** |
| `docs/RELIABILITY.md` | 「complete 竞态」措辞过时 |
| `mcp/server.mjs` | version 0.1.0 |
| `docs/research/*` | 部分论断已被 v0.3 archivePlanOnResult 推翻（历史稿，低优） |

---

## 4. 流程简化建议（Inference，供 CONTRACT 修订）

1. **S/M/L 分档**：L=完整九步；S=实现+一轮 code-reviewer+npm test  
2. **Agent 入口合并**：真源仅 `AGENT-CONTRACT.md`  
3. **双审查合并**：小 diff 一轮 code-reviewer；Hermes 回传始终审  
4. **CLI 文档分层**：Daily / Ops / Advanced  
5. **可选** `relay doctor` = health + watch --once + gc dry-run

---

## 5. 建议执行顺序（Hermes / 主 Agent）

**Batch 1（P0–P1，代码+文档小改）**
- [x] 重写 `docs/PROMPTS.md` → v2 send/receive/hermes 话术
- [x] 删除 `config.example.yaml` → `config.example.json`
- [x] `mcp/server.mjs` version → 0.3.0
- [x] `docs/RELIABILITY.md` complete 措辞 → result/archive
- [x] code-reviewer 修正 PROMPTS CLI 语法（`2b045dd`）

**Batch 2（P2，契约）**
- [x] `AGENT-CONTRACT.md` 增加 S/M/L 档位（§0.1）；Research-First 降为 L 档
- [x] 合并 AGENTS.md / `.cursor/rules/agent-relay.mdc` 为指针
- [x] `MEMORY.md` / `WORKLOG` 同步审计与 CodeGraph

**Batch 3（不做除非用户要求）**
- [x] 删除 deprecated CLI stub
- [x] 合并 relayLog/appendLog

---

## 6. CodeGraph

```bash
codegraph init    # 已完成
codegraph sync    # 文件变更后
codegraph status  # 392 nodes, 792 edges
```

MCP 工具：`codegraph_explore`（首选）、`codegraph_callers`、`codegraph_impact`。
