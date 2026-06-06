# agent-relay 原则（不可丢）

## 目标

用户无感完成跨 Agent 派活：**发 → 对方自动干 → 再发回来**。不要四个 IDE 轮流打开、轮流输入提示词。

## UX（最高优先级）

1. 下载 → 点运行 → 连跳浏览器授权（可接受）→ 最多重启一次 Cursor。
2. 按**角色**配置（发 / 收），不要四软件全家桶。
3. 发送方只认**逻辑节点名**；接收方 onboard 时自选 **wake provider**。
4. **不限制**执行工具（computer use、终端、MCP 等）；只要求做完 **send 回来**。
5. v1：**CLI + relayd**；后加 TUI/Web 面板，读同一份 `~/.agent-relay`。

## 协议（仅两个原语）

| 原语 | 含义 |
|------|------|
| **send** | 写任务到 `pending/<to>/` |
| **receive** | 列出自己的 pending + **claim**（防双跑） |

**「做」不是 relay 动作**：由 daemon 唤醒、MCP、hooks、AGENTS.md 触发；Agent 用原生能力执行。

回传、失败、进度 = 再次 **send**（`type: plan | result | failed | progress`），无单独 inbox/pull/complete。

## 数据

- 全局队列：`~/.agent-relay/`
- 任务必带：`from`、`to`、`projectPath`、正文
- 本机：`nodes.yaml`（节点 + wake provider）
- 项目（可选）：`.agent-relay/project.yaml`（默认派给谁）

## 架构

- **Core**：文件队列 + 原子写 + rename claim
- **relayd**：单例、幂等唤醒、spawn 本机 CLI
- **Providers**：`cursor-agent` | `hermes-cli` | `codex-exec` | `antigravity-cli`（`agy -p`）| `manual`
- **MCP**（发单方）：`relay_send`、`relay_receive`
- **Skills**（可选）：`relay-to-*`，不替代 daemon

## 明确不做

- Ruflo 联邦 / Hub / peer mesh
- 不对称回传链路（inbox、pull、complete）
- v1 Docker 门面、四 IDE 全 MCP、跨机同步
- 用「代码少」冒充「配置简单」
- 限制接收方工具集

## 产品路径

`relay setup` → `relayd` → `relay send/receive` → 后加 `relay serve`（自托管面板）
