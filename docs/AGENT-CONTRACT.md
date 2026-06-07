# Agent 工作契约

> **本文件不是第二套工作流**，而是把 agent-relay 的硬约束 **绑定到已有技能/体系**。  
> 新会话：读 `PRINCIPLES.md` → 本文件 → `MEMORY.md` → `WORKLOG.md`。  
> **MUST：** 执行约束前先 **Read 对应 SKILL.md**，按技能流程走，不在此重复技能全文。

---

## 0. 为什么不自己写流程

用户要求：**能约束就约束，但优先用现成技能**。下列体系里已有同类约束：

| 体系 | 核心约束 | 典型技能 |
|------|----------|------------|
| **Superpowers**（本仓库默认） | 计划 → subagent 实现 → **规格审查 → 质量审查** → 验证 → 收尾 | `writing-plans`, `subagent-driven-development`, `requesting-code-review`, `verification-before-completion` |
| **GSD / `.agents/skills`** | 证据先于声称；审查只读；TDD | `verify-before-complete`, `review`, `tdd`, `handoff` |
| **OMX / Codex** | 规划 → 实现 → 审查闭环，审查不 clean 回规划 | `autopilot`（`ralplan → ralph → code-review`） |
| **Cursor Subagent** | 隔离上下文的专业角色 | `code-reviewer`, `gsd-executor`, `gsd-code-fixer`, `explore` |

**agent-relay 默认栈 = Superpowers + Cursor subagent + GSD 验证/交接**。OMX `autopilot` 仅当用户显式要 `$autopilot` 时用。

不确定有没有技能 → **Read `find-skills`** 或 `npx skills find [query]`。

---

## 1. 约束 → 技能映射（MUST 对照执行）

### 1.1 多步功能（Phase / 多个 Task）

| 步骤 | MUST Read 技能 | MUST 产出 |
|------|----------------|-----------|
| 写计划 | **`writing-plans`** | `docs/superpowers/plans/YYYY-MM-DD-*.md`（含 Task checklist） |
| 隔离分支（大改） | **`using-git-worktrees`** | 独立 worktree（用户未禁止时） |
| 执行 | **`subagent-driven-development`** | 每 Task 新鲜 subagent；**禁止**主 Agent 写大 diff |
| 收尾 | **`finishing-a-development-branch`** | merge / PR / 清理选项 |

### 1.2 每个 Task 内（不可合并、不可跳过）

顺序来自 **`subagent-driven-development`** Red Flags：

```
implementer subagent
  → spec reviewer（模板: subagent-driven-development/spec-reviewer-prompt.md）
  → code quality reviewer（技能: requesting-code-review + code-reviewer subagent）
  → 若有 Important/Critical → gsd-code-fixer 或 implementer 重派 → re-review
  → verification-before-completion（fresh npm test）
  → WORKLOG 一行
```

| 审查类型 | 派谁 | 技能/模板 |
|----------|------|-----------|
| 规格 | `generalPurpose` subagent | **`spec-reviewer-prompt.md`** — 逐项 PASS/FAIL，不信 implementer 自述 |
| 质量 | `code-reviewer` subagent | **`requesting-code-review`** — 必带 `BASE_SHA` / `HEAD_SHA` / 需求摘要 |
| 修问题 | `gsd-code-fixer` 或 implementer | 修完 **必须** quality re-review |
| 整批终审 | `code-reviewer` subagent | 覆盖整个 commit range |

**MUST NOT**（摘自 superpowers Red Flags）：
- 一次 review 糊弄多个 Task  
- 规格未 ✅ 就做质量审查  
- 审查有问题仍进入下一 Task  
- 让 subagent 自己读 plan 文件（主 Agent 贴 **完整 Task 文本**）  
- implementer 自 review 代替 spec/quality 审查  

### 1.3 声称「完成 / 测试通过 / 已修复」

| MUST Read | 铁律 |
|-----------|------|
| **`verification-before-completion`**（Superpowers） | 同一消息内 **fresh** 跑验证；无输出 = 不能说完成 |
| **`verify-before-complete`**（GSD，同义） | 证据先于声称；「刚才跑过」不算 |

本项目验证命令：**`npm test`**（claim 时引用 pass N/N）。

### 1.4 上下文 >75%（或 summary / 跨 Phase）

| 步骤 | 技能 |
|------|------|
| 落盘 | 写 `MEMORY.md` / `WORKLOG.md`（只增，引用路径） |
| 交接 | **`handoff`** — OS 临时目录，含 suggested skills |
| 收窄 | 以 MEMORY/WORKLOG/ROADMAP 为真源；**禁止**再扫 transcript |

**MUST NOT：** 用 `caveman` 代替上下文管理。

### 1.5 其它常见场景

| 场景 | 技能 |
|------|------|
| 创意/新功能定稿前 | `brainstorming` |
| 写测试 | `test-driven-development` / `tdd` |
| 只读代码审查（无 subagent） | `review` |
| 安全 | `security-review` |
| 拆 PR | `split-to-prs` |
| 用户要全自动 | `autopilot`（OMX 三环，审查不 clean 回 `ralplan`） |
| Cursor 产品问题 | `cursor-guide` |

---

## 2. 角色分工（绑定 subagent 类型）

| 角色 | Cursor subagent / 技能 | MUST | MUST NOT |
|------|------------------------|------|----------|
| **主 Agent** | 编排 | Read 上表技能；拆 Task；派 subagent；合并摘要；落盘 | 自己实现大 diff；跳过双审查 |
| **Implementer** | `gsd-executor` / `generalPurpose` + **implementer-prompt.md** | 代码+测试+中文摘要 | 改 scope；无测试报完成 |
| **Spec reviewer** | `generalPurpose` + **spec-reviewer-prompt.md** | 独立 verify checklist | 信任 implementer 报告 |
| **Quality reviewer** | **`code-reviewer`** + **requesting-code-review** | BASE/HEAD SHA + 结构化结论 | 泛泛而谈 |
| **Fixer** | `gsd-code-fixer` | 最小 diff 修 Important+ | 顺手重构 |
| **Explore** | `explore` | 路径+结论 | 贴全文 |

---

## 3. agent-relay 专属边界（无外部技能替代）

来自 `PRINCIPLES.md` / `FOCUS.md` — **项目 MUST NOT**：

- inbox / pull / complete  
- Ruflo 联邦主路径  
- 默认 codex E2E（主路径 **cursor → hermes**）  
- 四 IDE 全家桶 setup  
- 无 ROADMAP 授权的 Docker / 跨机 / Web 面板  
- 新增 npm 运行时依赖  
- CLI 与 MCP 不同构（必须共用 `store.mjs`）  

技术：**新 provider** → `src/providers/` + `relayd.mjs`；**改协议** → `schema.mjs` + 测试。

---

## 4. Git / 沟通 / 自主推进

| 主题 | 规则 |
|------|------|
| commit/push | 用户授权自主推进 **或** 明确要求；遵循用户 git 安全规则 |
| 对用户 | 简体中文；结论先行；不贴 subagent 全文 |
| 自主推进 | 用户已授权 → 按 `ROADMAP` 继续，少反复确认 |

---

## 5. 回复用户前自检（10 秒）

1. 该 Task 是否 **Read 并遵循** 了对应 SKILL.md？  
2. 规格审查 + 质量审查是否 **各派一次**？  
3. `verification-before-completion`：**本轮** 有 `npm test` 输出吗？  
4. WORKLOG 写了吗？  
5. 上下文是否该 **`handoff`**？  

任一项否 → 先补，再对用户说话。

---

## 6. 技能路径速查

| 技能 | 路径 |
|------|------|
| subagent-driven-development | `~/.cursor/plugins/.../superpowers/.../subagent-driven-development/SKILL.md` |
| spec-reviewer-prompt | 同上目录 `spec-reviewer-prompt.md` |
| implementer-prompt | 同上目录 `implementer-prompt.md` |
| code-quality-reviewer-prompt | 同上目录 `code-quality-reviewer-prompt.md` |
| requesting-code-review | `~/.cursor/plugins/.../requesting-code-review/SKILL.md` |
| verification-before-completion | `~/.cursor/plugins/.../verification-before-completion/SKILL.md` |
| writing-plans | `~/.cursor/plugins/.../writing-plans/SKILL.md` |
| handoff | `~/.agents/skills/handoff/SKILL.md` |
| verify-before-complete | `~/.agents/skills/verify-before-complete/SKILL.md` |
| review | `~/.agents/skills/review/SKILL.md` |
| find-skills | `~/.agents/skills/find-skills/SKILL.md` |
| autopilot | `~/.codex/skills/autopilot/SKILL.md` |

> Cursor 内可直接 `@` 技能名或让 Agent **Read** 上表路径。

---

## 7. 文档索引

| 文件 | 用途 |
|------|------|
| **`docs/AGENT-CONTRACT.md`** | 本文件 — 约束 ↔ 技能绑定 |
| `AGENTS.md` | 仓库开发指引 |
| `docs/PRINCIPLES.md` | 产品原则 |
| `docs/MEMORY.md` | 踩坑与决策 |
| `docs/WORKLOG.md` | 时间线证据 |
| `.cursor/rules/agent-relay.mdc` | Cursor 自动加载摘要 |
