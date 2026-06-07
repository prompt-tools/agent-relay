# Reliability & Multi-System Design

## 设计目标

| 维度 | 要求 |
|------|------|
| **稳定** | 进程崩溃、IDE 关掉、重复执行不丢任务、不双认领 |
| **可靠** | 写盘原子、状态可审计、失败可恢复 |
| **多系统** | 同一套 CLI/MCP 服务 Cursor / Hermes / Codex / Antigravity / 纯终端 |
| **简单配置** | 一个 home 目录 + 可选 `config.json`，无 Docker |

## 核心机制

### 1. 原子写入

所有 JSON 任务文件：

1. 写入 `*.json.tmp.<pid>`
2. `fsync` 后 `rename` 到最终路径（同卷上原子）

避免写到一半被另一个 Agent 读到半截 JSON。

### 2. 认领互斥（claim）

`pending/<to>/<id>.json` → `active/<to>/<id>.json` 使用 **单步 `rename`**：

- 成功：仅一个执行方认领
- 失败（文件不存在）：已被别人认领或已完成

不依赖长期运行的锁服务。

### 3. 幂等与去重

- 任务 `id` 全局唯一（时间戳 + 随机）
- `relay send` 若目标路径已存在 → 报错，不覆盖
- `type=result` 且带 `taskId` 时内部将 plan `active→done`（archivePlanOnResult）

### 4. 失败路径

| 事件 | 落盘 |
|------|------|
| 执行失败 | `failed/<to>/<id>.json`；派发方 `relay send --type failed` |
| spawn 失败 | `relay recover` / relayd 自动 retry（最多 3 次） |

派发方用 `relay receive <node> --type result|failed` 拉取回传。

### 5. 可观测

```bash
relay status          # home 路径、各队列计数、最近 5 条
relay list <node>     # 按状态列任务
relay show <id>       # 单任务详情
```

日志（可选）：`~/.agent-relay/relay.log` 追加 JSONL，每条带 `op/taskId/ts`。

## 多系统实用

### 本机多 IDE（主场景）

```
~/.agent-relay/     ← 单一事实来源
     ↑
Cursor MCP / CLI / Hermes 话术 / Codex TOML 旁路脚本
```

各系统**只约定**：

- 读写的 home 相同（`AGENT_RELAY_HOME` 或默认 `~/.agent-relay`）
- 节点名一致：`cursor | codex | hermes | antigravity`

不在 core 里嵌 IDE SDK，降低脆性。

### 跨机器（封存，最后做）

见 [`docs/archive/cross-machine-sync/README.md`](archive/cross-machine-sync/README.md)。v1 本机验收通过前不实现 `relay sync`。

### 与 ruflo memory 分工

| 存什么 | 放哪 |
|--------|------|
| 任务正文、计划、验收 | agent-relay `plan.json` |
| 长期知识、模式 | ruflo memory |
| 回传摘要指针 | `result.json` + 可选 `memoryKeys` |

避免一个大 JSON 塞进 vector DB。

## 非功能需求

- **零原生依赖**：仅 Node 20+ 标准库
- **权限**：`relay init` 创建 `0700` 目录
- **跨平台路径**：`~` 展开，`path.join`，不硬编码 `/Users/...`
- **测试**：Phase 1 含 `node --test` 覆盖 send/claim/result 竞态

## 反模式（明确不做）

- 依赖 Docker / WebSocket Hub 才能派活
- 依赖对端 IDE 自动唤醒（v1 用通知 + 固定话术）
- 飞书作为唯一任务存储（仅可作通知层）
