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
| `AGENTS.md` | 开发指引 |
| `docs/PRINCIPLES.md` | 产品原则 |
| `docs/MEMORY.md` | 踩坑与决策 |
| `docs/WORKLOG.md` | 时间线 |
| `.cursor/rules/agent-relay.mdc` | Cursor 规则摘要 |
