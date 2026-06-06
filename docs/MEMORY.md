# Project Memory

> 本文件是 **agent-relay 项目级记忆**：决策、踩坑、约束。新会话先读 `PRINCIPLES.md` + 本文件。

## 核心决策（不可忘）

1. **对称 send/receive**，无 inbox/pull/complete。
2. **主 E2E 路径：cursor → hermes**（不是 codex；用户无 codex 额度）。
3. **唤醒是核心 UX**，不是可选；靠 `relayd` + provider spawn。
4. **按角色 setup**（sender/receiver/both），不要四 IDE 全家桶。
5. **v1 = CLI + relayd + MCP**，不做 Docker / 联邦 / Web 面板。

## 已验证事实

| 事实 | 证据 |
|------|------|
| Hermes 非交互唤醒 | `hermes chat -q "..." -Q --accept-hooks --yolo` |
| 回传 = 再次 send | E2E `HELLO RELAY` 约 8s 回到 `pending/cursor/` |
| relayd 去重 | `relayd.processed.json` + claim |
| MCP 与 CLI 同构 | `mcp/server.mjs` 调同一 `store.mjs` |
| project.yaml 可省略 to | `.agent-relay/project.yaml` → `defaultTo: hermes` |

## 踩坑与经验

### 协议层简单，产品层难

- 文件队列几百行能写完；**合适**要靠 setup OAuth、失败诊断、provider 维护。
- 「快做完」≠「可天天用」。

### Provider 必须跟 CLI 对齐

- 每个 Agent 的 headless 入口不同：`hermes chat -q`、`codex exec`、`agent`、`agy -p`。
- spawn 的 prompt **必须带完整 `relay send` 命令**（含 `AGENT_RELAY_HOME` 和 `relay.js` 绝对路径），否则 Hermes 不会回传。

### Setup 分角色

- **sender**：合并 `~/.cursor/mcp.json`，provider=manual，提示重启 Cursor。
- **receiver**：写 `nodes.yaml`、launchd、`hermes login`（交互时）。
- `--skip-auth` 给 CI/已登录用户；`--yes` 非交互。

### 工具调用会超时

- 长轮询 / MCP move 可能被中断；**直接写文件**比反复 Shell 更稳。

### 技能驱动开发

- 先 `writing-plans`，再 `subagent-driven-development`（每 Task spec + quality 审核）。
- 用户明确要求：**每个任务前找合适技能**。

## 明确不做

- Ruflo federation 主路径
- v1 四 provider 齐测
- Codex 作为默认 E2E（除非用户改口）
- 用「代码少」冒充「配置简单」

## 文件索引

| 用途 | 文件 |
|------|------|
| 原则 | `docs/PRINCIPLES.md` |
| 范围 | `docs/FOCUS.md` |
| 操作 | `docs/SETUP.md`, `docs/E2E.md` |
| 计划 | `docs/superpowers/plans/` |
| 工作记录 | `docs/WORKLOG.md` |

## 下一步（v1.1+）

- [ ] 真机 `~/.agent-relay` 长期跑 relayd
- [ ] `cursor-agent` provider（反向 hermes→cursor 若需要）
- [ ] 失败重试 / 进度 `type:progress` 面板
- [ ] GitHub 发布 + issue 模板
