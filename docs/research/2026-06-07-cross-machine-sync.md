# 跨机器文件队列 / Agent 任务中继同步模式调研

> 日期：2026-06-07  
> 范围：agent-relay Phase 3+ 跨机扩展的可选传输层，**非实现计划**  
> 依据：`PRINCIPLES.md`、`FOCUS.md`、`RELIABILITY.md`、`ARCHITECTURE.md`、`src/store.mjs`、`src/relayd.mjs`

---

## 执行摘要

agent-relay 的 v1 设计假设 **单一事实来源在本机 `~/.agent-relay/`**：对称 `send`/`receive`、**同卷 `rename` claim**、**本机单例 relayd**、**本机 `relayd.processed.json` 去重**。这些机制在单机多 IDE 场景下简洁可靠，但 **没有跨进程/跨机器的互斥或合并语义**。

若要把「cursor 发 plan → 远端 hermes 自动干 → send 回 cursor」延伸到两台物理机，必须额外引入 **队列目录的复制或共享**。业界常见路径分五类：

| 类别 | 代表 | 与 agent-relay 的契合度（粗评） |
|------|------|--------------------------------|
| Git 原生同步 | balls、GNAP、git pull/push 循环 | **中等**：审计与离线友好，但 claim/rename 状态需重新建模 |
| 目录镜像 | rsync `~/.agent-relay` | **低–中**：简单但延迟高、rename 跨镜像非原子 |
| 共享文件系统 | NFS / SMB 挂载同一 home | **低**：看似「零改代码」，实则破坏 rename claim 假设 |
| 专用消息中间件 | Redis / RabbitMQ / NATS | **范围外**：能力最强，违背零依赖与 v1 边界 |
| 双向云同步 | Syncthing / Dropbox | **低**：冲突副本与移动语义与 claim 路径不兼容 |

**核心结论**：没有任何现成方案能「原样挂载 `~/.agent-relay` 就开跨机」。最小侵入路径通常是 **只同步 `tasks/` 子树 + 每机独立 relayd/processed/nodes**，并 **把 claim 从目录 rename 升级为带 lease 的显式状态字段或 Git 乐观锁**；或引入 **HTTP relay 网关**（RELIABILITY.md 已列为 Phase 3+ 备选），由中心服务持有队列真相。

---

## 行业模式对照表

| 模式 | 工作原理（一句话） | 延迟 / 一致性 | 运维成本 | 对 rename claim 的支持 | 对 relayd 单例 + processed.json 的影响 | 主要 race / 冲突风险 |
|------|-------------------|---------------|----------|------------------------|----------------------------------------|----------------------|
| **balls** | 任务 JSON 提交到 orphan 分支 `balls/tasks`，`bl sync` = fetch + merge + push；claim 改 JSON 字段 | 秒–分钟级；合并时一致 | 低（私有 Git remote） | **不支持目录 rename**；用字段状态 + merge 规则 | 每 worker 本地 cache；无 daemon 去重 | 双 worker offline claim 同一 task → push 冲突，需 field-wise resolver |
| **GNAP** | `.gnap/` 下 agents/tasks/runs/messages JSON；heartbeat：pull → 读 → 干活 → commit → push | 心跳间隔级 eventual | 低 | 任务状态在 JSON 内更新，非 FS rename | 无 relayd 概念；各 agent 自管 | 标准 git merge 冲突；双 agent 改同一 task 文件 |
| **Git pull/push 循环** | 专用仓或分支只放队列；producer push pending，consumer pull 后 claim 再 push | 取决于轮询频率 | 低–中 | OpenTabs 用 **push CAS**（先 push 赢）；git-queue 用 **空 commit 事件溯源** | 需外置「已处理」集合或 commit 标记 | 并发 push 非 fast-forward；丢序；合并覆盖 |
| **rsync 镜像** | cron/ inotify 单向或双向 rsync 整个 `~/.agent-relay` | 秒–分钟；快照式 | 低 | **镜像期间 pending/active 可能不一致** | 两机各跑 relayd → **双 claim / 双 wake**；processed 不同步 | 同步窗口内读到半文件；rename 在源/宿不同步 |
| **NFS / 共享 FS** | 多机挂载同一 `~/.agent-relay` 路径 | 近实时 | 中–高 | **NFS 上跨 client rename 非全局原子**（RFC：atomic to client） | 两机 relayd 同时 tick → **竞态 claim**；pid 锁仅本机有效 | LOOKUP/OPEN 与 RENAME 交错 → ENOENT；客户端删文件时 NFS 无引用计数 |
| **消息 broker** | 队列在 Redis/RabbitMQ/NATS；消费者 ack | 毫秒级；强一致可选 | 高（服务+监控） | 原生支持 visibility timeout / ack | relayd 可改为 broker consumer；**架构分叉** | 范围外；若采用则非「文件即队列」 |
| **Syncthing** | P2P 块级同步；冲突 → `.sync-conflict-*` 副本 | 秒级 eventual | 中 | **rename 被建模为 delete+create**；双端同时改 → 冲突副本 | 每机独立 relayd + 独立 processed → **重复 spawn** | 同时 claim（pending→active）可能变成两个冲突文件 |
| **Dropbox** | 云主副本 + 客户端同步；冲突 → `conflicted copy` | 秒–分钟 | 低（账号） | 不 merge；保留两份；**移动/重命名易冲突** | 同 Syncthing + 云依赖 | 离线双端编辑同一 JSON；自动保存触发假冲突 |

---

## 深度分析

### 1. Git 原生同步

#### 1.1 balls（Branching Agent Labor and Logistics System）

- **机制**：任务为 JSON 文件，存在 **与 main 无共同历史的 orphan 分支** `balls/tasks`。`bl claim` 改 task 状态并建 worktree；`bl sync` 执行 fetch → merge → 字段级冲突解析 → push。双 worker offline claim 同一任务时，**先 push 者赢**，后者 sync 时检测冲突并按 status  precedence 回滚自己的 claim。
- **优点**：零 daemon；完整 git 审计；与「Agent 本来就会 commit」文化一致；text-mergeable schema 降低 merge  pain。
- **缺点**：延迟 = 人工/脚本 sync 频率；claim 不是 FS rename，而是 **commit 级乐观锁**；需要私有 remote 与 credential 管理。
- **对 agent-relay**：目录布局（`pending/active/done`）与 balls（单文件状态机）**不同**。若把 `tasks/` 纳入 git 仓，必须决定：(a) 用 balls 式字段 `status` 替代 rename claim，或 (b) 只 git-sync `pending/` 新增，claim 仍本地 rename（则其他机器看不到 active，易双跑）。balls 的 **field-wise resolver** 是 agent-relay 目前缺失的 merge 层。

#### 1.2 GNAP（Git-Native Agent Protocol）

- **机制**：四类实体（agents、tasks、runs、messages）均为 JSON；统一 heartbeat：`git pull` → 读分配 → 执行 → commit → `git push`。冲突：**普通 git merge**；ordering 靠时间戳字段。
- **优点**：开放 RFC 草案；人类可读；离线可工作；无中心服务。
- **缺点**：多 agent 改同一 task JSON 时 merge 负担在应用层；heartbeat 间隔 bound 一致性。
- **对 agent-relay**：GNAP 的 task/run 分离类似「plan + 多次 run 尝试」，比 agent-relay 的「pending 里混 plan/result/progress」更细，但 **迁移成本高**。若只同步 `tasks/pending/<node>/` 作为「邮箱」，GNAP 式 pull/push 可行，但 **claim/active/done 状态机仍需重新定义**（不能假设 rename 跨 commit 原子）。

#### 1.3 朴素 git pull/push 循环

- **机制变体**：
  - **OpenTabs / opentabs-prds**：PRD 为工作单元；consumer push claim 时依赖 **GitHub 上 push 序列化** → 失败者 non-fast-forward 重试 → 天然 CAS。
  - **git-queue（Nautilus）**：空 commit 作为事件存储，乐观锁保证 **同时仅一个 active job**。
  - **gitmq**：每消息一个 commit；consumer 用 tag 标记已处理。
- **优点**：无新基础设施；审计即 `git log`；与 RELIABILITY.md 已列「Git 同步 tasks/ 私有仓」一致。
- **缺点**：吞吐低；**rename 在 git 里是 delete+add 两笔变更**，并发 merge 时易出现「pending 与 active 同时存在」或丢 rename；需明确 **哪些路径入仓**（不应同步 `relayd.pid` / `relayd.processed.json`）。
- **冲突/race**：
  - 机器 A claim（pending→active）尚未 push，机器 B 仍见 pending → **双 wake**。
  - 双向同时 push 同一 task 文件 → merge conflict，无内置 resolver 则人工介入。
  - `gitmq` 式「一任务一 commit」与 agent-relay「一任务一文件多次 rewrite（claim 后改 status）」交互复杂。

**Git 族共性**：适合 **2–3 台开发机、低频率派活**；必须把 **claim 语义从 rename 提升到 commit-merge 层**，或接受 **仅单向 producer→consumer 同步 pending 新增** 的简化模型。

---

### 2. rsync 镜像 `~/.agent-relay`

- **机制**：cron 或 fswatch 触发 `rsync -a ~/.agent-relay/ remote:~/.agent-relay/`（或只同步 `tasks/`）。常见技巧：先 sync 到 temp 目录再 rename swap——**仅在同一本地 FS 上原子**；跨主机 rsync **无目录级原子 swap**。
- **优点**：零代码；运维熟悉；可只传 `tasks/pending/<remote-node>/` 降低带宽。
- **缺点**：
  - **延迟**：relayd tick 周期 vs rsync 周期之间，consumer 看不到新 plan。
  - **双向 rsync 无 merge**：后跑覆盖先跑，或 `--update` 导致 stale 胜利。
  - **双 wake 的真实条件**：`relayd` 只消费 **`pending/<本机 nodeId>/` 且 `type=plan`**（见 `tick()`）。cursor 机 `nodeId=cursor` 时**不会** wake `pending/hermes/`。风险来自 **同一逻辑 node 两台机器都跑 relayd**（或错误 nodeId），而非「任意两机各有一个 relayd」。
- **对 agent-relay**：**每机只应有一台 relayd 负责某逻辑 node 的 wake**；rsync 必须配合 **「仅 owner 机器跑 relayd」** 或 **同步 processed + 分布式锁**。只 rsync `tasks/` 而 **不同步 `relayd.processed.json`** 会重复唤醒。

---

### 3. NFS / 共享文件系统

- **机制**：Mac mini + NAS，或 VM 共享 `/mnt/agent-relay` → 各机 `AGENT_RELAY_HOME` 指向同一路径。
- **表面吸引力**：**零改 store.mjs**；send 写即全局可见。
- **致命问题**（与 RELIABILITY.md「rename claim」假设冲突）：
  - POSIX/NFS：`rename` **对调用 client 原子**，**不保证多 client 全局互斥**。Client1 LOOKUP 后 Client2 RENAME 删除目标 → Client1 后续操作 ENOENT。
  - **relayd.pid 单实例锁**：`process.kill(old, 0)` 仅本机有效；两机可同时 acquireLock。
  - **relayd.processed.json**：`writeFileSync` 整文件覆盖，两机并发 tick → **lost update**，同一 task 可再次 wake。
  - **nodes.yaml / config.json**：本机 nodeId、provider 路径各机不同，**不应共享**；共享 home 会混配置。
- **结论**：裸 NFS 挂载整个 `~/.agent-relay` **不推荐**；若坚持用共享 FS，至少需要 **仅共享 `tasks/`** + **每机独立 meta** + **分布式 claim 锁**（已超出 v1 core）。

---

### 4. 消息 broker（范围外，备忘）

- **机制**：Redis List/Stream、RabbitMQ queue、NATS JetStream 等；consumer group + ack/visibility timeout。
- **优点**：毫秒延迟；成熟互斥；可水平扩展 relayd。
- **为何拒绝（v1/v2 边界）**：
  - `PRINCIPLES.md` / `FOCUS.md`：**零额外运行时依赖**、不做 Ruflo 联邦/Hub。
  - 「文件即队列」可调试性（`ls`、`cat`）丧失。
  - 运维与密钥管理成本上升。
- **若未来破例**：broker 应只承载 **信封**，大正文仍落 `artifacts/` 或 git；relayd 变为 consumer；**与现有 CLI/MCP 同构** 需新 adapter 层。

---

### 5. Syncthing / Dropbox

#### Syncthing

- **机制**：设备间块同步；版本向量检测并发修改；冲突时保留较旧版本为 `.sync-conflict-<date>-<device>.ext`。
- **rename 语义**：Syncthing **不跟踪 rename**；claim 的 pending→active 可能被识别为「一端删、一端增」，同步顺序不确定。
- **对 agent-relay**：两台机器各跑 relayd + 各有一份 processed → **极易双 spawn**。冲突副本会导致 **同一 taskId 多个 JSON**，破坏 `findTaskFile` 假设。

#### Dropbox

- **机制**：云为权威副本；冲突策略 **不 merge**，保留 canonical + `conflicted copy` 副文件。
- **额外风险**：自动保存、离线编辑、移动文件夹 → 假冲突；对 **频繁 rewrite 的 JSON**（claim 后 `atomicWriteJson` 更新 status）不友好。
- **对 agent-relay**：适合「偶尔人工拷贝 plan」，**不适合自动派活闭环**。

**云同步族共性**：eventual consistency + **duplicate-on-conflict** 与 agent-relay「全局唯一 task id + 单路径状态机」**根本冲突**。

---

## 与 agent-relay 模型的契合度

### 当前协议要点（单机真相）

```
send      → tasks/pending/<to>/<id>.json     （tmp+fsync+rename 原子写）
receive   → list pending/<node>/
claim     → rename pending → active         （同卷单步 rename = 互斥）
relayd    → 本机 nodeId 的 pending plan → claim → spawn provider
回传      → 再次 send → pending/<from>/    （type: result|failed|progress）
```

### 对称 send/receive + relayd claim 的跨机张力

| 设计点 | 单机假设 | 跨机挑战 |
|--------|----------|----------|
| rename claim | 内核保证同一 FS 上互斥 | 复制/同步层不传播 rename 原子性 |
| relayd 单例 | `relayd.pid` 本机进程 | 每机一个 relayd → 多机同时 claim 同一 pending |
| processed 去重 | 本地 Set，wake 成功后写入 | 不同步则重复 wake；同步则 write 竞态 |
| nodes.yaml | 本机 wake provider / binary 路径 | 不能共享；hermes 只在 Mac Studio 存在 |
| projectPath | 绝对路径 | 跨机路径不一致（需映射或相对 repo root） |
| 无 merge | 每 task 单文件单 writer | 同步冲突 = 双文件或半 JSON |

### 各方案与 E2E「cursor → hermes」的匹配

- **最贴 RELIABILITY 文档已写**：私有 git 仓 sync `tasks/`（2–3 台开发机；文档中 inbox 行已过时，见局限 §10）。
- **plan vs result 方向**：
  - **plan**：cursor `send` → sync → 执行机 **relayd wake**
  - **result**：执行机 `send` → sync → cursor 机 **MCP/CLI receive**（非 relayd wake）
- **最危险**：NFS 全 home、Dropbox 全 home、双向 rsync 无协调。

---

## 当前设计的局限（跨机视角）

以下在 v1 单机场景是 **特性**，跨机时成为 **缺口**：

1. **relayd 单实例语义是本机的**  
   `acquireLock` 检查的是本机 PID 文件，不能阻止远端第二实例。

2. **`relayd.processed.json` 是本机去重，非全局**  
   `tick()` 在 claim 成功后 `processed.add(task.id)`；失败时 `handleWakeFailure` 会 remove。多机各自维护 → 同一 plan 可被多台 relayd 各 wake 一次。

3. **claim 依赖 rename，无 lease / 版本号**  
   `claimTask` 成功后 `atomicWriteJson` 写 `claimedAt`——这是 **第二次写**，在共享或同步 FS 上与其他观察者交错。没有「compare-and-swap id + expected status」。

4. **无 merge 语义**  
   `sendTask` 碰撞 id 直接报错；冲突副本、git merge 冲突无 resolver。`recoverTask` 只做 active→pending 单文件移动。

5. **状态桶分散**  
   pending/active/done/failed 四目录；同步工具对 **目录移动** 的处理不一致，易出现「双桶同时存在同一 id」。

6. **`projectPath` 与 `nodes.yaml` 无跨机规范**  
   文档未定义 homedir 映射、SSH 路径等价或「仅传 repo git url + 相对路径」。

7. **relay.log / artifacts 未纳入同步策略**  
   跨机排障时日志不在一处；大 artifact 全量 sync 贵。

8. **`relay serve` 已有但仅本机** — 本地 HTTP 面板可读 watch snapshot；**无**跨机 aggregate / hub 联邦。

9. **v1 明确不做跨机**（`FOCUS.md`、`PRINCIPLES.md`）  
   现代码无 sync hook、无 remote node 路由。

10. **文档漂移**：`RELIABILITY.md` 仍提及 `inbox/`、`relay pull` — v2 已废弃对称 send/receive；引用 Git 同步方向时需按 v2 解读。

---

## 开放问题

1. **队列真相归谁？** 中心 git 仓、中心 HTTP relay、还是「每对节点单向 sync」？
2. **claim 跨机表达**：继续 rename（仅共享 FS + 强锁），还是改为 JSON 字段 `status` + `claimedBy` + `leaseExpires`（balls/GNAP 路线）？
3. **relayd 部署规则**：是否规定 **每个逻辑 node 仅一台机器运行 relayd**（cursor 机不 wake hermes 的 plan）？
4. **processed 是否入同步**：若入，需 append-only 或 CRDT；若不入，需全局 idempotency key 在 task 信封上。
5. **projectPath 映射**：`project.yaml` / 节点配置是否增加 `pathMap` 或统一用 git clone 相对路径？
6. **result 回传方向**：hermes send result 到 `pending/cursor/` 后，由谁 sync 回 cursor 机——同一条 git 流还是反向 rsync？
7. **安全边界**：私有 git 仓 vs Syncthing 设备密钥 vs 未来 HTTP relay 的 auth；任务 JSON 可能含敏感 plan 正文。
8. **与 `relay serve` 关系**：本地面板只读本机 home；跨机是否需只读 aggregate API（Phase 3 serve 的延伸）？
9. **延迟 SLA**：派活可接受 30s / 5min / 1h？决定 git pull 频率 vs 实时 broker。
10. **失败与 stuck active**：远端 claim 后 crash，cursor 机看不到 active；谁执行 `relay recover`？

---

## 推荐方向（选项，非最终计划）

以下为 **决策菜单**，供 Phase 3 跨机 slice 选型；可组合，非互斥。

### 选项 A：Git 邮箱（最小基础设施，对齐 RELIABILITY.md）

- **做法**：私有 git 仓只跟踪 `tasks/pending/**`（及可选 `done/` 归档）；各机 cron/`relay sync`：`pull → 本地 relayd 消费本 node pending → push 状态变更 commit`。
- **改造量**：中等——claim 改为 **commit 内改 status 字段** 或 **pending 删除 + active 新增** 的单 commit；提供 merge 规则。
- **适合**：2–3 台开发机、低频率、要 audit trail。
- **风险**：merge 冲突、延迟、需 disciplined「仅 owner 改某 node pending」。

### 选项 B：物理分家 + 单向 rsync（运维最简单）

- **做法**：cursor 机 `send` 后 rsync `tasks/pending/hermes/` → hermes 机；**仅 hermes 机跑 relayd**；result rsync 回 cursor 的 `pending/cursor/`。
- **改造量**：小—— mostly 运维文档 + `projectPath` 映射约定。
- **适合**：固定两台机器、局域网、可接受 tens-of-seconds 延迟。
- **风险**：双向 rsync 误配置；processed 不同步导致重复 wake（需 hermes 机独占 relayd + cursor 机 disable hermes relayd）。

### 选项 C：HTTP relay 网关（中心服务，长期可扩展）

- **做法**：`relay serve` 延伸为 **可选 hub**：remote `relay send` POST 信封，hub 写中心 FS 或 DB；subscriber relayd pull/long-poll。**RELIABILITY.md 已列**。
- **改造量**：大——新协议边界、auth、与零依赖原则张力（可仍零 npm dep，用 node:http）。
- **适合**：>3 节点、需要集中 observability、未来非 git 用户。
- **风险**：运维 hub；与「不要 Ruflo 联邦」精神需划清——**轻量 hub ≠ 联邦 mesh**。

### 选项 D：保持单机，跨机用显式 `SEND-TO-*.txt` / 人工（v1 延续）

- **做法**：不 sync 队列；cursor 生成委派文件，人工或 Hermes 侧脚本 ingest 为本地 `relay send`。
- **改造量**：无 core 改动。
- **适合**：偶发跨机、不要求自动闭环。
- **风险**：违背「用户无感派活」长期目标。

### 不建议作为 v1 跨机默认

- **整目录 NFS / Dropbox / Syncthing 挂载 `~/.agent-relay`**
- **无协调的双向 rsync 全 home**
- **引入 Redis/RabbitMQ 作为 v1 硬依赖**

---

## 参考与延伸阅读

| 名称 | 链接 | 备注 |
|------|------|------|
| GNAP | https://github.com/farol-team/gnap | Git-native agent 协调 RFC 草案 |
| balls | https://github.com/mudbungie/balls | orphan 分支 + field-wise merge |
| OpenTabs git queue | https://github.com/opentabs-dev/opentabs-prds | push CAS 认领 PRD |
| git-queue | https://github.com/Nautilus-Cyberneering/git-queue | 空 commit 事件溯源 |
| abq | https://github.com/aygp-dr/abq | 文件系统队列对比（Efrit 系） |
| Syncthing conflicts | https://docs.syncthing.net/users/syncing.html | `.sync-conflict-*` 行为 |
| agent-relay RELIABILITY | `docs/RELIABILITY.md` | 已列 git / Syncthing / HTTP 方向 |
| agent-relay ROADMAP | `docs/ROADMAP.md` | Phase 3 跨机 unchecked |
| 下游设计稿 | `docs/superpowers/specs/2026-06-07-cross-machine-sync-design.md` | 基于本调研；非实现承诺 |

---

*本文档为调研结论，不构成实现承诺。下游设计稿通过后，须 `writing-plans` + 协议/schema 变更评审再落地。*
