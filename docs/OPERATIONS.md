# 运维一页纸

> 单机用户的日常操作速查。复杂排障见 [E2E.md](E2E.md) / [RELIABILITY.md](RELIABILITY.md)。

---

## 1. 每日 30 秒检查

```bash
# 1a. 系统健康：队列计数 + orphan 检测
relay health

# 1b. 队列快照：pending / active / 日志末尾
relay watch --once
```

**看什么：**
- `orphanPendingPlans` 应为 `[]`——有孤儿说明 relayd 没正常 claim
- pending 数量异常偏高 → 可能 relayd 挂了
- active 长时间不变 → 任务可能卡住（见 §5）

---

## 2. 发任务

### CLI（推荐）

```bash
# 已配 project.yaml（defaultTo: hermes）→ 省略目标
relay send --project . --title "任务标题" --plan-text "## 步骤\n1. ..."

# 显式指定目标
relay send hermes --from cursor --project ~/Projects/foo \
  --title "修复登录" --plan-text "## 步骤\n1. 改 auth.ts\n2. npm test"
```

### MCP（Cursor 内）

配置好 MCP 后，在 Cursor Agent 里直接调 `relay_send` 工具即可，参数同 CLI。
适合不想离开 IDE 的场景。

---

## 3. 收结果

```bash
# 拉取 cursor 节点的回传
relay receive cursor --type result

# 看失败的
relay receive cursor --type failed
```

结果 JSON 在 `~/.agent-relay/tasks/pending/cursor/`，`body.summary` 是摘要。

---

## 4. 验收

```bash
# 单元 + 集成测试（含 relayd fake-spawn 全链路）
npm test

# 一键全链路冒烟（需 relayd + hermes 均在线，约 10–30s）
relay smoke --project .
```

**改动后必跑 `npm test` 全绿再提交。**

---

## 5. 常见问题

### relayd 没跑

```bash
# 检查进程
ps aux | grep relayd

# 手动启动（调试）
relayd
# 或 node bin/relayd.js

# 看 stderr 日志
cat ~/.agent-relay/relayd.stderr.log
```

### orphan（孤儿 pending）

relayd 已 claim 但进程中途挂了，任务留在 active 不回来。

```bash
relay gc --yes    # 清理 processed 孤儿
```

### stuck 任务（卡在 active）

```bash
# 将卡住的任务从 active 退回 pending，等 relayd 重新 claim
relay recover hermes

# 指定节点
relay recover cursor
```

### MCP 不工作

1. 检查 `~/.cursor/mcp.json` 是否有 relay 条目
2. 重启 Cursor
3. `relay status` 确认 config.json 节点名正确

---

## 6. 派 Hermes 干活的标准 plan 模板

复制以下模板，按需修改发给 Hermes。每段都是约定，缺了执行方可能猜不到你要什么。

```bash
relay send hermes --from cursor --project /absolute/path/to/project \
  --title "具体任务标题" \
  --plan-text '## 目标
一句话说清要做什么。

## 必含章节
1. 第一步要做的事
2. 第二步要做的事
3. 第三步要做的事

## 约束
- 只改哪些文件/目录
- 零依赖 / 零新包 / 零配置变更（按需选）
- 其他限制

## 不做
明确排除的范围，防止 Agent 发散。

## 验收标准
- npm test 全绿
- 特定命令输出符合预期
- 其他可量化的标准

## 回传
完成后运行（YOUR_SUMMARY 替换为实际摘要）:
AGENT_RELAY_HOME='\''~/.agent-relay'\'' node /path/to/bin/relay.js send '\''cursor'\'' \
  --type result --task-id '\''YOUR_TASK_ID'\'' --project '\''YOUR_PROJECT'\'' \
  --title Done --body '\''{"summary":"YOUR_SUMMARY"}'\''''
```

### 模板要素说明

| 字段 | 必须？ | 说明 |
|------|--------|------|
| **目标** | ✓ | 一句话，执行方不需要猜 |
| **必含章节** | ✓ | 拆成可执行的步骤 |
| **约束** | 建议 | 防止改多了或改错了范围 |
| **不做** | 建议 | 明确边界，防止 Agent 发散 |
| **验收标准** | ✓ | 可量化：测试通过、文件存在、命令输出 |
| **回传命令** | ✓ | 带 taskId 和项目路径，Hermes 跑完直接 send 回来 |

---

## 速查卡

| 场景 | 命令 |
|------|------|
| 看健康 | `relay health` |
| 看队列 | `relay watch --once` |
| 发任务 | `relay send hermes --title T --plan-text "..."` |
| 收结果 | `relay receive cursor --type result` |
| 跑测试 | `npm test` |
| 冒烟 | `relay smoke --project .` |
| 清孤儿 | `relay gc --yes` |
| 恢复卡住 | `relay recover hermes` |
| 本机面板 | `relay serve` → http://127.0.0.1:3847 |
