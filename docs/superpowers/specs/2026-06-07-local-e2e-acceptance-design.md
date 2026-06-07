# 本机 E2E 验收 — 设计稿

> 日期：2026-06-07  
> 上游：`docs/research/2026-06-07-local-e2e-acceptance.md`（审调研 WARN → 已采纳）  
> 状态：待设计审查

---

## 1. 目标

使 **cursor → hermes → cursor** 在本机具备：

1. **CI 可证明的闭环**（relayd tick + 模拟 executor 回传 result）  
2. **队列卫生**（orphan 可检测、可清理）  
3. **plan 生命周期闭合**（result 到达后 plan 进 `done/`，不新增 `complete` 原语）

## 2. 非目标

- 跨机 sync（封存）  
- 新 npm 依赖  
- `relay complete` / inbox 语义  
- live hermes 进 CI（仅文档 + 可选 CLI）  
- receive 自动删除 result（保持可多次 read）

---

## 3. 方案

### 3.1 `archivePlanOnResult`（store 内部）

在 `sendTask` 末尾，当 `type === 'result'` 且 `taskId` 存在：

```
active/<from>/<taskId>.json  →  rename  →  done/<from>/<taskId>.json
```

- `from` = result 信封的 `from`（执行方 node，如 hermes）  
- 源文件不存在：**静默 no-op**（避免 result 重复 send 抛错）  
- 更新 JSON `status: 'done'`，`completedAt` 时间戳  
- **不**暴露新 CLI；仍是 `relay send --type result`

### 3.2 health：`orphanPendingPlans`

在 `healthReport.checks` 增加：

```json
"orphanPendingPlans": [{ "id": "...", "node": "hermes" }]
```

定义：`id ∈ relayd.processed` **且** `tasks/pending/<node>/<id>.json` 存在 **且** `type=plan`。

`health.ok` 仍为 true（警告级），但 `checks.orphanPendingPlans.length > 0` 时 summary 提示跑 `relay gc`。

### 3.3 `relay gc`

```
relay gc [--dry-run] [--yes]
```

- 扫描各 node 的 `pending/`、`type=plan`  
- 若 plan 的 `id ∈ processed` → **删除** pending 副本（真身应在 active/done；pending 为脏副本）  
- **不**删 result、**不**删未 processed 的 legit pending、**不**动 processed

### 3.4 集成测试 `test/e2e-relayd.test.mjs`

temp home，`nodeId=hermes`，fake spawn：

1. 解析 spawn args 中 `relay send cursor --type result` 命令  
2. `execFile` 执行该命令（或等价调用 `sendTask` result）  
3. 断言：claim 后 plan 在 active；result 后 cursor pending 有 result；plan 在 done  

覆盖 PRINCIPLES 主路径 **hermes** provider（非 codex）。

### 3.5 文档

- `E2E.md`：增加「自动化验收 `npm test` 含 e2e-relayd」  
- `RELIABILITY.md`：删除/标注 inbox 过时句（v2 send-only 一句）  
- `ROADMAP`：本机 E2E 项在实现后勾选  
- `WORKLOG` 一条

---

## 4. 数据流（归档后）

```
send plan → pending/hermes
relayd claim → active/hermes
hermes send result → pending/cursor + archivePlanOnResult → done/hermes
cursor receive → 读 pending/cursor（不变）
```

---

## 5. 成功标准

- [ ] `npm test` 全绿，含新 e2e-relayd 用例  
- [ ] `relay health` 在生产 home 跑 `relay gc --yes` 后 `orphanPendingPlans: []`  
- [ ] 可选：人工再跑一条 live `PROD3 OK`（不阻塞 CI）

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| result 无 taskId 时不归档 | 文档要求 provider prompt 必须带 `--task-id`（已有） |
| gc 误删未 processed 的 legit pending | 仅删 `id ∈ processed` 的 plan |
| archive 时 plan 仍在 active | rename 原子；失败 no-op |
