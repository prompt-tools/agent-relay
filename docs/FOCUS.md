# 当前聚焦（排除杂音版）

## 我们要做的唯一东西

**本机 Agent 任务邮政局**：Cursor（等）`send` 计划 → relayd 唤醒目标 CLI Agent → 做完再 `send` 回传。

## 已否决方向（勿再讨论/实现）

| 方向 | 原因 |
|------|------|
| Ruflo `federation_*`、Hub、peer 脚本 | 过重、非派活主路径 |
| `inbox/` + `pull` + `complete` | 已改为对称 **send** |
| 每 IDE 打开 + 贴提示词 | UX 反模式 |
| v1 Docker 跑执行 | 本机 spawn CLI 更稳 |
| 「Antigravity 无 CLI」 | 官方有 **agy**，`-p` 非交互 |
| 全盘抄 agent-pool / gastown / cairn | 只借鉴：delegate 唤醒、setup 合并 MCP、文件队列 |
| relay 内置 execute API | 「做」归 MCP/hooks/Agent |

## v1 交付清单（按顺序）

1. **协议**：`send` / `receive`（含 claim）；信封加 `projectPath`、`type`；废弃 inbox 语义
2. **Core**：统一路径 `tasks/pending/<node>/`；幂等 claim；send 只写 pending
3. **relayd**：单实例 + 去重；见 pending → 按 `nodes.yaml` spawn provider；prompt 含 taskId +「做完 send 回 `<from>`」
4. **relay setup**：角色选择 → 检测 CLI → 顺序 OAuth → 写 `nodes.yaml` → 合并 Cursor MCP → 装 launchd
5. **MCP**：`relay_send`、`relay_receive`（stdio，与 CLI 同构）
6. **先打通一条线**：**cursor → hermes**（已实测 E2E）
7. **文档**：PRINCIPLES.md 为准；VISION.md 待对齐（唤醒改为核心）

## v1 不做

- 四 provider 齐发、Antigravity 必测、跨机、Web 面板、A2A/ACP 原生实现

## 唤醒命令（provider 参考，实现时再用）

```
codex exec ...
agent --workspace <projectPath> --force --approve-mcps ...
hermes chat -q "..." -Q --accept-hooks --yolo  # cwd=projectPath
agy -p "..." --dangerously-skip-permissions  # 按需
```

## 成功标准（v1）

CC 一条 `relay_send`（或 MCP）→ 无需开对方 IDE → 结果出现在 `pending/cursor/` 的 `type:result` 任务里。
