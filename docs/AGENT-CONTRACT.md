# Agent 工作契约

> **约束 Agent 行为的主文档**。新会话：先读 `PRINCIPLES.md` + 本文件 + `MEMORY.md` + `WORKLOG.md`。  
> 模型再「自由」，以下 **MUST / MUST NOT** 也尽量当硬门槛，不可凭感觉跳过。

---

## 1. 角色分工（编排 vs 执行）

| 谁 | MUST | MUST NOT |
|----|------|----------|
| **主 Agent** | 读 ROADMAP/MEMORY/WORKLOG；拆 Task + 验收标准；派 subagent；合并摘要汇报用户；落盘；有授权时 commit/release | 自己写大段实现；吞 subagent 全文 diff；跳过审查直接声称完成 |
| **Subagent（实现）** | 按 Task 规格改代码 + 测试；返回简短中文摘要 | 改 scope；动无关文件；无测试就报完成 |
| **Subagent（审查）** | 对照 checklist / git range 出 PASS·WARN·FAIL | 泛泛而谈；不读实际 diff |

---

## 2. 每个 Task 的硬流程（不可合并偷懒）

多步功能 **MUST** 按顺序走；单步小修可省略 plan，但 **审查不可省**。

```
① 选技能 → ② 实现(subagent) → ③ 规格审查(subagent) → ④ 质量审查(subagent)
→ ⑤ 修 Important/Critical(subagent) → ⑥ re-review(若修了) → ⑦ npm test 证据 → ⑧ 落盘
```

### ② 实现前 — 选技能

| 场景 | 必须先用的技能 |
|------|----------------|
| 新 Phase / 多 Task | `writing-plans` → `docs/superpowers/plans/` |
| 按计划执行 | `subagent-driven-development` |
| 声称完成 / commit / release 前 | `verification-before-completion` |
| 上下文满 / 出现 summary | 上下文预算（§4）+ 必要时 `handoff` |

### ③④ 审查 — Mandatory

每个 Task **MUST** 两次独立 subagent 调用（**禁止**一次 review 糊弄两个 Task）：

1. **规格审查** — 对照 Task checklist 逐项 PASS/FAIL  
2. **质量审查** — `code-reviewer`，带 `BASE_SHA`、`HEAD_SHA`、需求摘要（见 `requesting-code-review`）

整批 Task 结束后 **MUST** 再派一次 **终审** `code-reviewer` 覆盖整个 commit range。

| 审查结论 | 主 Agent MUST |
|----------|----------------|
| Critical / Important | 派 `gsd-code-fixer` 修 → 再 quality re-review |
| Minor | 记录；可下一迭代修 |
| 规格 FAIL | 不得 commit；退回实现 subagent |

---

## 3. 完成门槛（声称「做完了」之前）

**全部满足才可对用户说完成：**

- [ ] `npm test` 在本轮消息里刚跑过，输出 **pass N/N**
- [ ] 本 Task 规格审查 PASS
- [ ] 本 Task 质量审查无未修 Important/Critical
- [ ] `docs/WORKLOG.md` 有本轮摘要（一行也行）
- [ ] 新踩坑/decision 写入 `docs/MEMORY.md`（无则跳过）
- [ ] Phase/版本级变更更新 `CHANGELOG.md` / `ROADMAP.md`

**MUST NOT：** 无测试证据的「应该没问题」；只改代码不更新 WORKLOG。

---

## 4. 上下文预算（>75% 或 proxy 信号）

无法读 token 百分比时，见任一 **proxy 信号** 即执行：

- 系统注入 conversation summary  
- 跨 Phase / 大 feature 刚结束  
- 需反复扫 transcript 才能继续  
- 同任务已很多轮 + 大量 tool 输出仍在上下文  

**顺序 MUST NOT 打乱：**

1. 落盘 — 新内容进 `MEMORY.md` / `WORKLOG.md`（引用路径，不贴 plan 全文）  
2. commit — 用户已授权自主推进且有未提交改动  
3. 收窄 — **真源** = MEMORY / WORKLOG / ROADMAP / plan；**禁止**再扫完整 transcript  
4. handoff — 会话仍很长 → `handoff` 技能，写 OS 临时目录交接  
5. 表达 — 对用户简短；代码用 `startLine:endLine:path`，不贴大段  

**MUST NOT：** 用 `caveman` 代替上下文管理。

---

## 5. 产品与技术边界

来自 `PRINCIPLES.md` / `FOCUS.md`，**MUST NOT 违反**：

| MUST NOT | 原因 |
|----------|------|
| 恢复 inbox / pull / complete | 已改为对称 send/receive |
| Ruflo 联邦作主路径 | 过重 |
| 默认 codex E2E | 用户无额度；主路径 **cursor → hermes** |
| 四 IDE 全家桶 setup | 按角色 sender/receiver/both |
| v1 Docker / 跨机 / Web 面板（除非 ROADMAP 已开） | 范围外 |
| 新增 npm 运行时依赖 | 零依赖 ESM |
| CLI 与 MCP 不同构 | 必须共用 `store.mjs` |

**MUST：** 新 provider → `src/providers/` + 注册 `relayd.mjs`；改协议 → 先 `schema.mjs` + 测试。

---

## 6. Git 与发布

| 动作 | 规则 |
|------|------|
| commit | 用户明确授权自主推进 **或** 用户要求 commit |
| push | 同上；默认 push `main` 前 test 全绿 |
| tag/release | Phase 收尾或用户要求；更新 CHANGELOG |
| amend / force push | 遵循用户 git 安全规则 |

---

## 7. 对用户沟通

- **语言：** 简体中文（除非用户换语言）  
- **风格：** 结论先行；不贴 subagent 全文；不 engagement bait  
- **自主推进：** 用户说「授权你接着做」→ 按 ROADMAP 继续，少问「要不要做 X」  

---

## 8. 会话自检（回复用户前 10 秒）

主 Agent 心里过一遍：

1. 这轮有没有自己写本该 subagent 写的大 diff？  
2. 每个 Task 是否都做了 **规格 + 质量** 两次审查？  
3. 说「完成」前有没有 **fresh** 的 `npm test`？  
4. WORKLOG 写了吗？  
5. 上下文是否该触发 §4 预算？  

任一项否 → 先补再做，不要对用户报假完成。

---

## 9. 文件索引

| 文档 | 用途 |
|------|------|
| `docs/AGENT-CONTRACT.md` | 本文件 — Agent 硬约束 |
| `AGENTS.md` | 开发指引 + 命令 |
| `docs/PRINCIPLES.md` | 产品不可丢原则 |
| `docs/FOCUS.md` | v1 范围 |
| `docs/MEMORY.md` | 决策与踩坑 |
| `docs/WORKLOG.md` | 时间线证据 |
| `docs/ROADMAP.md` | Phase 进度 |
| `.cursor/rules/agent-relay.mdc` | Cursor 自动加载摘要 |
