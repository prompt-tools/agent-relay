# Vision

## 我们要解决什么

同一台 Mac 上同时用 **Cursor、Codex、Hermes、Antigravity**（以及各自 CLI）。需要：

1. **CC 做好计划** → 自动/半自动交给执行方（如 Hermes）
2. **执行方做完** → 产物（结论、文件路径、diff 摘要）**回传 CC**
3. **配置简单** — 不搞 Docker Hub、peer 常驻、联邦信封那套
4. **跨边界** — 跨 Agent、跨 IDE、跨 CLI，同一套任务格式

## 核心洞察（来自实践）

| 发现 | 含义 |
|------|------|
| Ruflo 联邦能投递 inbox，**不能自动唤醒**对端 IDE | 联邦适合跨机审计，不适合本机「派活」主路径 |
| 共享 `CLAUDE_FLOW_CWD` + memory **已经能共享上下文** | 缺的是**结构化任务队列 + 回传约定** |
| 飞书 @ 多 Bot 可行，但要 relay，且 Bot 不能自动跑 IDE | 聊天层是可选 UI，不是执行层 |
| GitHub 无「四 IDE + 回传」一键方案 | 值得做薄层开源工具 |

## 目标

- **稳定可靠**：文件队列 + 原子写 + rename 认领，不依赖常驻 Hub
- **多系统实用**：同一 `~/.agent-relay` 服务 Cursor / Hermes / Codex / CLI
- **任务信封**：一份 JSON/Markdown，含计划、验收标准、上下文指针
- **双向中继**：`outbound`（派活）+ `inbound`（回传），按 `nodeId` 分目录
- **极简 CLI**：`relay send` / `relay pull` / `relay ack`
- **可选 MCP**：Cursor 里 `relay_send`，与 CLI 等价
- **唤醒策略诚实**：默认「文件触发 + 固定话术」；进阶再做 watcher / webhook

## 非目标（第一版不做）

- 替代 Slack/飞书（后续可选接入）
- 替代 Ruflo swarm / hive-mind
- 跨公网 NAT（本机优先；以后可用 Git 同步任务目录）
- 自动无人工点开 Hermes（v1 不承诺）

## 成功标准（Phase 1）

1. CC 一条命令把计划写给 `hermes`
2. Hermes 侧固定话术能读到任务并执行
3. Hermes `relay complete` 写回产物
4. CC `relay pull` 看到 completed 与 artifact 路径
5. 全程 **零 Docker、零联邦 peer**
