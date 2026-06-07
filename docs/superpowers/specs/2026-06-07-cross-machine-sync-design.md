# 跨机同步 — 设计稿（非实现计划）

> **封存** — 见 [`docs/archive/cross-machine-sync/README.md`](../../archive/cross-machine-sync/README.md)。本机 E2E 稳定后再实现。

> 日期：2026-06-07  
> 上游调研：`docs/research/2026-06-07-cross-machine-sync.md`  
> 状态：**已审查 · 已封存** — 实现计划已写，代码未开工

---

## 1. 目标

在 **不引入 broker、不破坏零 npm 依赖** 前提下，支持 **2 台固定开发机** 的闭环：

```
cursor 机 send plan → hermes 机 relayd 自动 wake → hermes send result → cursor 机 receive
```

延迟可接受 **30s–2min**（非实时）。

## 2. 非目标

- 多节点 mesh / Ruflo 式联邦  
- NFS/Dropbox/Syncthing 挂载整个 `~/.agent-relay`  
- **无协调的双向 rsync 整个 home**（含 meta）  
- 引入 Redis/RabbitMQ/NATS 等 **broker 硬依赖**  
- 跨机 rename claim 零改动（调研已证伪）  
- v0.3 内实现 HTTP hub（选项 C 留 Phase 4）  
- 以人工委派（选项 D）作为 3a 正式方案

---

## 3. 方案对比（摘自调研）

| 方案 | 改造量 | 延迟 | 风险 | 与 PRINCIPLES 契合 |
|------|--------|------|------|-------------------|
| **A Git 邮箱** | 中–高（claim 语义升级） | pull 周期 | merge 冲突 | 高（文件+审计） |
| **B 单向 rsync + 分家 relayd** | **低**（CLI+文档+约定） | rsync 周期 | 误配双向 rsync | 高（不改 core 语义） |
| **C HTTP hub** | 高 | 低 | 运维中心 | 中（RELIABILITY 备选） |
| **D 人工委派** | 无 | — | 无感派活失败 | 仅过渡 |

---

## 4. 推荐：分阶段 **B → A**

### Phase 3a（先做）：`relay sync` + 运维契约 — **选项 B**

**设计要点：**

1. **只同步任务子树**，不同步 meta：
   - 推送：`tasks/pending/<remoteNode>/`（cursor → hermes 时 push hermes 队列）
   - 拉回：`tasks/pending/<localNode>/`（hermes → cursor 的 result）
   - **永不 rsync**：`relayd.pid`、`relayd.processed.json`、`relayd.retries.json`、`nodes.yaml`、`config.json`

2. **部署规则（硬约定，写入 SETUP.md）**：
   - **每个逻辑 node 仅一台机器运行 relayd** 消费其 pending plan  
   - 例：hermes 机 `nodeId=hermes` + relayd；cursor 机 `nodeId=cursor` + MCP sender，**不** wake hermes plan

3. **CLI**：`relay sync push|pull|status [--peer user@host] [--remote-home PATH]`  
   - 底层 `rsync -az`（只增 pending 文件；**不对 pending 用 `--delete`**，避免误删）
   - 可选 cron 每 30s

4. **`projectPath`**：两机用 **同一 git clone 路径**（3a 不做 `pathMap`，留 3b）

5. **stuck active**：仅 **执行机** 跑 `relay recover`

6. **纵深**：`relayd` 按 `nodeId` 只 wake 本 node 的 pending plan；配合 §2 部署规则防双 wake

### Phase 3a 范围

| In scope | Out of scope |
|----------|--------------|
| `src/sync.mjs` + `relay sync push\|pull\|status` | `pathMap`、Git 邮箱、HTTP hub |
| `docs/SYNC.md` 操作手册 | 同步 `active/done/failed/artifacts` |
| `test/sync.test.mjs`（meta 拒绝 + rsync 参数） | schema v3 / claim 字段化 |
| `SETUP.md` 两机检查清单（文字） | 3a 实现 `relay health` 双机检测（仅文档 checklist） |

**局限（显式接受）：**

- rename claim 仍仅在本机 FS 有效；跨机靠 **「pending 文件出现在执行机后才 wake」** 避免双跑  
- rsync 窗口内可能延迟；非强一致  
- 配置错误（两机都跑 hermes relayd）仍会双 wake — 用 `relay health` + 文档 + setup 检查缓解

### Phase 3b（后做）：Git 邮箱 — **选项 A**

当 B 不够（>2 机、要 audit、要 offline merge）时：

- 私有 git 仓 track `tasks/pending/**`  
- `claimTask` 演进为 **JSON 字段 `status` + `claimedBy` + `leaseExpires`**（balls 式），或单 commit 移动  
- `relay sync` 子命令 `git pull && git push`  
- 需 schema v3 + merge resolver — **单独 milestone**

---

## 5. Phase 3a 组件草图

```
┌─────────────┐   rsync push pending/hermes/   ┌─────────────┐
│ cursor 机   │ ───────────────────────────► │ hermes 机   │
│ send plan   │                              │ relayd wake │
│ (no hermes  │ ◄─────────────────────────── │ send result │
│  relayd)    │   rsync pull pending/cursor/ └─────────────┘
└─────────────┘
```

新增文件（实现计划阶段再细化）：

- `src/sync.mjs` — rsync 命令构建、路径白名单  
- `bin/relay.js` — `sync push|pull|status`  
- `docs/SYNC.md` — 两机 setup 清单  
- `test/sync.test.mjs` — mock rsync 或 dry-run 参数断言

---

## 6. 成功标准（3a）

**CI 可测：**

- [ ] `npm test` 全绿；无新 npm 依赖  
- [ ] `relay sync` 拒绝同步 meta 路径（`relayd.pid`、`processed` 等）  
- [ ] rsync 命令参数断言（dry-run / mock）

**双机手册 E2E（人工或 nightly）：**

- [ ] cursor `send hermes` → push → hermes relayd wake → pull → cursor `receive` result  
- [ ] cron 30s 下，plan 出现在执行机 pending 后 **≤ 90s**  
- [ ] 误配两机同 `nodeId=hermes` 时，SETUP checklist 标 FAIL（3a 不自动化 health 双机检测）

---

## 7. 待设计审查确认项

1. 3a 是否采用 **rsync 单向 push/pull** 而非 git（推荐：是）  
2. `pathMap` 是否推迟到 3b（推荐：是，3a 同路径 clone）  
3. HTTP hub 是否明确标 Phase 4（推荐：是）

---

*设计审查通过后，使用 `writing-plans` 生成 `docs/superpowers/plans/2026-06-07-phase3-sync-rsync.md`。*
