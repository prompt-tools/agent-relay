# Project Memory

> 项目级记忆：决策、踩坑、约束。新会话：**PRINCIPLES.md + 本文件 + WORKLOG 尾部**。

## 核心决策（不可忘）

1. **对称 send/receive**，无 inbox/pull/complete（deprecated stub 已删除，Batch 3 完成）。
2. **主 E2E：cursor → hermes**（非 codex 默认）。
3. **唤醒 = relayd + provider spawn**；prompt 尾部须含完整 `relay send` 命令。
4. **按角色 setup**（sender/receiver/both），非四 IDE 全家桶。
5. **零 npm 运行时依赖**；CLI 与 MCP 同构（`store.mjs`）。
6. **跨机封存** → `docs/archive/cross-machine-sync/`（方案 B→A，**未写代码**）。
7. **v0.3.0 已发布**（2026-06-07）：本机目标达成。
8. **编排真源** → `docs/AGENT-CONTRACT.md`：**S/M/L 档位** + Hermes **§0.3 必审** + 自主 push（少问用户）。
9. **CodeGraph**（2026-06-07）：项目根 `codegraph init`；MCP `user-codegraph` 查询；`.codegraph/` **不入 git**。

## 已验证事实

| 事实 | 证据 |
|------|------|
| Hermes 非交互唤醒 | `hermes chat -q ... -Q --accept-hooks --yolo` |
| 回传 = send result | PROD2/PROD3 OK；`archivePlanOnResult` → `done/` |
| relayd 去重 | `processed` + claim；orphan → `relay gc` |
| CI 闭环 | `test/e2e-relayd.test.mjs` + **62/62** |
| Live 验收 | `relay smoke --project .` |
| Hermes 派活闭环 | v0.3.0 prep + audit batch1（commit → code-reviewer → fix） |
| MCP 版本 | `SERVER_INFO.version` = **0.3.0**（与 package.json 一致） |

## 踩坑与经验

### launchd / PATH

- `nodes.yaml` 存 **hermes 绝对路径**；plist 注入 PATH；spawn 须监听 `error`。

### processed 竞态

- `handleWakeFailure` 须 **delete processed**；`recoverTask` 须回写 JSON。

### orphan pending

- `id ∈ processed` 且仍在 `pending/` → 计数脏；**不会**双 wake → `relay gc --yes`。

### 文档勿用 v1 话术

- **`docs/PROMPTS.md`** 已对齐 v2（2026-06-07 审计 Batch 1）；Hermes 若读旧 complete/inbox 会做错。
- 配置示例：**`config.example.json`**（非 yaml）。

### shell 引号

- `relaySendInstruction` 路径/node 单引号包裹。

### 全仓库审计（2026-06-07）

- 报告：`docs/research/2026-06-07-full-repo-audit.md`
- 架构 hub：`store.mjs`；provider 表硬编码在 `relayd.mjs`
- Batch 1 ✅ PROMPTS、config.example、MCP version、RELIABILITY
- Batch 2 ✅ CONTRACT S/M/L、AGENTS/rule 瘦身
- Batch 3 ✅ 删 deprecated stub + 合并 appendLog/relayLog → `src/log.mjs`

### 变更档位（CONTRACT §0.1）

| 档 | 何时 |
|----|------|
| **S** | 文档/小 fix → 一轮 code-reviewer |
| **M** | 新子命令/多文件 → plan + code-reviewer |
| **L** | 协议/provider/跨机 → 完整 Research-First 九步 |

## 明确不做

- Ruflo 联邦、跨机 sync（封存）、Docker、inbox 语义回归

## 文件索引

| 用途 | 文件 |
|------|------|
| **契约** | `docs/AGENT-CONTRACT.md` |
| **记忆** | 本文件 |
| **运维** | `docs/OPERATIONS.md` |
| **E2E** | `docs/E2E.md` |
| **审计** | `docs/research/2026-06-07-full-repo-audit.md` |
| **跨机（封存）** | `docs/archive/cross-machine-sync/` |
| **进展** | `docs/WORKLOG.md` |
| **范围** | `docs/FOCUS.md` · `docs/ROADMAP.md` |

## 维护态（v0.3.0+）

日常：`relay health` · `npm test` · 偶发 `relay smoke`。新 Phase 走 L 档或封存项恢复条件。
