# 本机 E2E 验收 — 现状调研

> 日期：2026-06-07  
> 范围：**单机** cursor → hermes → cursor 闭环是否「可重复证明可用」  
> 非目标：跨机同步（已封存）、新 provider、协议 v3

---

## 执行摘要

| 维度 | 现状 | 缺口 |
|------|------|------|
| 单元/集成测试 | `npm test` **54/54** 绿 | **无** relayd tick 级「假 spawn → 自动 result」闭环测试 |
| 历史人工 E2E | `PROD2 OK` 曾成功 | ROADMAP / `E2E.md` checklist **未系统化勾选** |
| 生产队列 | relayd 绿、无 stuckActive | **3 个孤儿 pending 文件**（id 已在 `processed`） |
| 任务生命周期 | claim → active | result 回传后 **plan 不归档**（active 永久或孤儿 pending） |
| 文档 | `E2E.md` 完整 | 缺「一键验收」入口；`RELIABILITY.md` 仍有 inbox 过时表述 |

**结论**：本机 **功能已通**，但 **验收可重复性** 不足——需要自动化 relayd 闭环测试 + 队列卫生 +（可选）result 触发 plan 归档，才能把 ROADMAP「本机 E2E 可重复通过」勾上。

---

## 1. 已有证据

### 1.1 自动化测试（`npm test`）

覆盖：store send/claim/receive、relayd tick（fake spawn）、MCP、health、watch、serve、recover、providers。

`test/store.test.mjs` 有 `send → claim → send result back`，但 **不经过 relayd**，不验证 prompt 尾部的 `relay send` 是否被「执行方」调用。

`test/relayd.test.mjs` 验证 tick wake，**不模拟** spawn 子进程回写 result。

### 1.2 生产环境（`~/.agent-relay`）

```
relay health → ok: true, relayd pid 22210, hermes ready
stuckActive: []
pending/cursor: 1× type=result (PROD2 OK)
pending/hermes: 2× type=plan (已在 processed)
active/*: 空
done/*: 空
```

`relay.log`：两次 claim + 一次 result send，无 `wake_retry`。

### 1.3 孤儿 pending 成因（推断）

合法路径：`claim` 把 plan 移到 `active/`；`processed` 记录 id 后 tick 跳过。

当前：**pending 里仍有 plan 且 id ∈ processed** → 不一致状态。可能组合：

1. `handleWakeFailure` 里 `recoverTask` 失败（active 已空）时 **不会** `processed.delete`  
2. 人工/脚本把文件拷回 pending  
3. 无 `completeTask`：result 到达后无人移动 plan，运维上易与「重发 plan」混淆  

**影响**：`watch`/`status` 计数偏大；**不**触发重复 wake（processed 挡掉）。属于 **可观测性/卫生** 问题，非核心功能阻断。

---

## 2. E2E.md Checklist 对照

| 项 | 生产证据 | 自动化 |
|----|----------|--------|
| send → pending/hermes | ✅ 历史 log | ✅ store test |
| relayd 运行 | ✅ launchd | ✅ health test |
| plan → active | ✅ claim log | ✅ claim test |
| spawn 含 relay send result | ✅ relayd stderr 可见完整命令 | ⚠️ 仅断言 hermes 在 cmd 链 |
| result → pending/cursor | ✅ PROD2 OK | ✅ store test（无 relayd） |
| npm test 全绿 | ✅ 54/54 | ✅ |

**缺口**：缺一条 **relayd 驱动 + 模拟 executor 回传 result** 的测试，无法 CI 证明「闭环」。

---

## 3. 业界/常见做法（单机 Agent 队列）

| 做法 | 说明 | 适合 agent-relay |
|------|------|------------------|
| **Contract test** | mock spawn，断言 argv/env | ✅ 已有 partial |
| **Golden path integration** | temp home + fake CLI 写 result | ✅ **推荐补** |
| **Live smoke** | 真 API，cron/nightly | 可选 `relay e2e --live` |
| **Queue GC** | 归档 done / 清理孤儿 | 推荐 `health` 警告 + `relay gc` |

不做：Browser E2E、Docker compose（PRINCIPLES 否决 v1 Docker）。

---

## 4. 当前设计局限（本机视角）

1. **无 `completeTask`** — result 的 `taskId` 不会把 plan 从 active→done  
2. **无 orphan 检测** — processed ∩ pending 同一 id 无 health 项  
3. **无官方 smoke 命令** — 依赖人工读 E2E.md  
4. **receive 不 claim** — result 永久留 pending（by design，MCP 可多次读）  
5. **文档漂移** — RELIABILITY inbox 语义 vs v2 send

---

## 5. 推荐验收策略（供设计稿选用）

**最小集（MUST）**

- A. `test/e2e-relayd.test.mjs`：temp home + fake spawn 执行 `relay send cursor --type result ...`  
- B. `health` 增加 `orphanPending` 检查（processed 中的 plan id 仍出现在 pending）  
- C. `relay gc`（或 `relay clean`）：删除/归档孤儿 pending plan（仅 processed 中的 id）

**应做（SHOULD）**

- D. **`sendTask(type=result)` 内部副作用** — 带 `taskId` 时将该 plan 从 `active/<from>/` → `done/<from>/`（**不**新增 `complete` 原语；与 PRINCIPLES 一致）

**可选（COULD）**

- E. `relay e2e smoke` — 本机 live 一条极简 hermes 任务（文档化，默认不跑 CI）

---

## 6. 开放问题（设计阶段定夺）

1. `gc` 是 **delete** 孤儿 pending 还是 **move to done**？  
2. `completeTask` 是否 v1 必做，还是仅 gc + 文档？（推荐：**做 completeTask**，与 result.taskId 已有字段一致）  
3. live smoke 是否进 CLI，还是只 `npm test` + 文档 manual 段？

---

## 7. 参考

- `docs/E2E.md` — 成功标准  
- `docs/FOCUS.md` — 当前优先级  
- `docs/ARCHITECTURE.md` — pending/active/done 布局  
- `src/relayd.mjs` — tick / processed / handleWakeFailure  
- `src/store.mjs` — send/claim（无 complete）
