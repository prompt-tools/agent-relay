# Agent 工作契约

> 把 agent-relay 的硬约束 **绑定到 Superpowers 技能 + Cursor Subagent**。  
> 新会话：**Read `using-superpowers`** → 本文件 → `PRINCIPLES.md` → `MEMORY.md` → `WORKLOG.md`。  
> **MUST：** 动手前先 **Read 对应 Superpowers SKILL.md**；审查/实现派 **Cursor Subagent**。

**本仓库只用两套体系，不用 GSD / OMX / 其它技能库。**

---

## 0. 双体系分工

| 层 | 负责什么 | 入口 |
|----|----------|------|
| **Superpowers** | 何时做、按什么顺序、Red Flags、验证门槛 | Cursor 插件技能（Read SKILL.md） |
| **Cursor Subagent** | 隔离上下文地 **实现 / 审查 / 探索 / 修 review** | Task 工具，`subagent_type` |

主 Agent = 编排者：Read 技能 → 拆 Task → 派 Subagent → 合并摘要 → 落盘。

---

## 0.1 新功能全链路（Research-First，MUST 按序）

**禁止** 跳过调研直接写 plan 或写代码。用户已授权自主推进时，**不必逐步询问**，但 **不可跳过审查 Subagent**。

```
① 调研 Research     → docs/research/YYYY-MM-DD-<topic>.md
② 审调研            → generalPurpose（对照 PRINCIPLES/FOCUS/现架构）
③ 设计 Design       → Read brainstorming → docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
④ 审设计            → generalPurpose（方案对比、局限、非目标是否清晰）
⑤ 实现计划 Plan     → Read writing-plans → docs/superpowers/plans/YYYY-MM-DD-*.md
⑥ 审计划            → generalPurpose（spec-reviewer-prompt 风格，逐项 PASS/FAIL）
⑦ 落地 Implement    → subagent-driven-development（每 Task Implementer）
⑧ 审代码            → 每 Task：Spec + code-reviewer；整批终审
⑨ 验证落盘          → verification-before-completion + WORKLOG + commit
```

| 阶段 | Superpowers | Cursor Subagent |
|------|-------------|-----------------|
| ① 调研 | `brainstorming`（探索上下文） | `explore` 或 `generalPurpose` 写 research.md |
| ② 审调研 | — | `generalPurpose` |
| ③ 设计 | **`brainstorming`** | 主 Agent 汇总或派 `generalPurpose` 写 design.md |
| ④ 审设计 | — | `generalPurpose` |
| ⑤ 计划 | **`writing-plans`** | 主 Agent 或 `generalPurpose` |
| ⑥ 审计划 | — | `generalPurpose`（spec reviewer） |
| ⑦–⑨ | §1.2 流程 | §1.2 Subagent 表 |

**MUST NOT：** 调研未审就写 design；design 未审就 `writing-plans`；plan 未审就派 Implementer。

---

## 0.2 派给 Hermes / 外部执行方（MUST）

目标已明确时，**主 Agent 自主推进**，不必向用户逐步确认。仅当破坏性操作或范围不明时才问用户。

```
① 主 Agent relay send hermes（plan 含约束、验收、是否允许 commit/push）
② relayd 唤醒 Hermes 执行
③ Hermes relay send cursor（type=result）
④ 主 Agent 派 code-reviewer 审 Hermes 产出（BASE..HEAD 或指定 commit）— **不可跳过**
⑤ 按 review 修正（主 Agent 或 Fixer Subagent）
⑥ verification-before-completion：`npm test` fresh pass
⑦ 该合并的合并、该 push/tag/release 的按 ROADMAP 执行 — **无需再问用户**
⑧ WORKLOG 一行
```

| 步骤 | Subagent |
|------|----------|
| ④ 审 Hermes | **`code-reviewer`**（第三方，非 Hermes 自审） |
| ⑤ 修 Critical/Important | Implementer / `gsd-code-fixer` |

**MUST NOT：** Hermes result 未审就 merge/push；把「要不要发布」甩给用户（ROADMAP 已列发布项则直接做）。

---

## 1. Superpowers 技能映射

### 1.1 会话与多步功能

| 场景 | MUST Read 技能 | 产出 |
|------|----------------|------|
| **每个新会话** | **`using-superpowers`** | 确认如何找技能、先 Read 再答 |
| 创意 / 新 Phase 定稿 | **`brainstorming`** | 需求与设计对齐后再写 plan |
| 多 Task 实现 | **`writing-plans`** | `docs/superpowers/plans/YYYY-MM-DD-*.md` |
| 大改隔离 | **`using-git-worktrees`** | 独立 worktree（用户未禁止时） |
| 本会话执行 plan | **`subagent-driven-development`** | 每 Task 新鲜 Subagent |
| 另开会话执行 plan | **`executing-plans`** | 带 checkpoint 的并行会话 |
| 2+ 独立 Task 并行 | **`dispatching-parallel-agents`** | 多个 Subagent 同时派 |
| 全部 Task 完成 | **`finishing-a-development-branch`** | merge / PR / 清理 |
| Bug / 测试红 | **`systematic-debugging`** | 先证据再修 |
| 写功能 / 修 bug 前 | **`test-driven-development`** | 先 failing test |

### 1.2 每个 Task 内（`subagent-driven-development`）

```
① Read implementer-prompt.md → 派 Implementer Subagent
② Read spec-reviewer-prompt.md → 派 Spec Reviewer（generalPurpose）
③ Read requesting-code-review → 派 code-reviewer（带 BASE_SHA / HEAD_SHA）
④ Important/Critical → 派 Fixer Subagent → ③ re-review
⑤ Read verification-before-completion → fresh npm test
⑥ WORKLOG 一行
⑦ 全部 Task 完 → 再派 code-reviewer 终审整个 range
```

| 步骤 | Superpowers | Cursor Subagent |
|------|-------------|-----------------|
| 实现 | `implementer-prompt.md` | `gsd-executor` 或 `generalPurpose` |
| 规格审查 | `spec-reviewer-prompt.md` | `generalPurpose` |
| 质量审查 | `requesting-code-review` | **`code-reviewer`** |
| 收到 review 意见时 | **`receiving-code-review`** | 主 Agent 判断是否采纳再派 Fixer |
| 修 Important+ | — | `gsd-code-fixer` 或 Implementer 重派 |
| 声称完成 | **`verification-before-completion`** | 主 Agent 跑 `npm test` |

**MUST NOT**（Superpowers Red Flags）：
- 一次 review 糊弄多个 Task  
- 规格未 ✅ 就做质量审查  
- 有问题仍进下一 Task  
- 让 Subagent 自己读 plan（主 Agent 贴 **完整 Task 文本**）  
- Implementer 自 review 代替双审查  

验证命令：**`npm test`** — claim 时必须引用本轮 **pass N/N**。

### 1.3 上下文 >75%（proxy：summary / 跨 Phase / 反复扫 transcript）

无单独 handoff 技能；按本仓库协议：

1. 新内容 → `MEMORY.md` / `WORKLOG.md`（只增，引用路径）  
2. 有授权且有待提交改动 → commit  
3. **真源** = MEMORY / WORKLOG / ROADMAP / plan；**禁止**再扫 transcript  
4. 对用户回复缩短；代码用 citation  

---

## 2. Cursor Subagent 速查

| subagent_type | 何时派 |
|---------------|--------|
| **`code-reviewer`** | 每 Task 质量审查；整批终审 |
| **`generalPurpose`** | Spec 审查；小 Task 实现 |
| **`gsd-executor`** | 按计划实现（多文件 Task） |
| **`gsd-code-fixer`** | 修 review 的 Important/Critical |
| **`explore`** | 查代码结构；只返路径+结论 |

主 Agent **MUST NOT** 自己写大 diff 代替 Implementer。

---

## 3. agent-relay 专属边界

来自 `PRINCIPLES.md` / `FOCUS.md` — **MUST NOT**：

- inbox / pull / complete  
- Ruflo 联邦主路径  
- 默认 codex E2E（主路径 **cursor → hermes**）  
- 四 IDE 全家桶 setup  
- 无 ROADMAP 授权的 Docker / 跨机 / Web 面板  
- 新增 npm 运行时依赖  
- CLI 与 MCP 不同构  

**MUST：** 新 provider → `src/providers/` + `relayd.mjs`；改协议 → `schema.mjs` + 测试。

---

## 4. Git / 沟通

- commit/push：用户授权自主推进 **或** 明确要求  
- 对用户：简体中文；结论先行；不贴 Subagent 全文  

---

## 5. 回复前自检

1. 是否 Read 了该步 Superpowers SKILL.md？  
2. 本 Task 是否 **Spec + Quality** 各派一次 Subagent？  
3. 是否按 **`verification-before-completion`** 刚跑过 `npm test`？  
4. WORKLOG 写了吗？  
5. 上下文是否该触发 §1.3 落盘+收窄？  

---

## 6. Superpowers 模板路径

均在 Cursor Superpowers 插件目录下（`subagent-driven-development/`）：

- `SKILL.md`
- `implementer-prompt.md`
- `spec-reviewer-prompt.md`
- `code-quality-reviewer-prompt.md`

其它常用技能同插件：`writing-plans`、`requesting-code-review`、`verification-before-completion`、`using-superpowers`。

---

## 7. 文档索引

| 文件 | 用途 |
|------|------|
| **`docs/AGENT-CONTRACT.md`** | 本文件 |
| `docs/research/` | 调研结论（先于 design/plan） |
| `docs/superpowers/specs/` | 设计稿（先于 plan） |
| `docs/superpowers/plans/` | 实现计划 |
| `docs/PRINCIPLES.md` | 产品原则 |
| `docs/MEMORY.md` | 踩坑与决策 |
| `docs/WORKLOG.md` | 时间线 |
| `.cursor/rules/agent-relay.mdc` | Cursor 规则摘要 |
