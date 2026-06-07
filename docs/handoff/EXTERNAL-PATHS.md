# 仓库外路径

> 接替 Agent 可能需要读/写的本机路径（不在 git 内）

## 运行时数据

| 路径 | 说明 |
|------|------|
| `~/.agent-relay/` | relay 主目录（tasks、nodes、logs、launchd plist） |
| `~/.agent-relay/tasks/pending/<node>/` | 待处理任务 JSON |
| `~/.agent-relay/tasks/done/` | 已完成 plan 归档 |
| `~/.agent-relay/nodes.yaml` | receiver/sender 节点配置（JSON 格式） |
| `~/.cursor/mcp.json` | `relay setup` 合并的 MCP 配置 |

## Cursor 项目元数据

| 路径 | 说明 |
|------|------|
| `~/.cursor/projects/Users-klaus-Projects-agent-relay/agent-transcripts/27cbf5fa-6645-444a-b1b1-f0b0921dbb08/` | **本会话**完整 transcript（含 subagents） |
| `~/.cursor/projects/Users-klaus-Projects-agent-relay/mcps/` | 本会话 MCP 工具描述符缓存 |
| `~/.cursor/projects/Users-klaus-Projects-agent-relay/terminals/` | 终端会话输出 |

## 本地索引（不入 git）

| 路径 | 说明 |
|------|------|
| `~/Projects/agent-relay/.codegraph/` | CodeGraph SQLite 索引（392 nodes）；`codegraph init` 生成 |

## GitHub

| 项 | 值 |
|----|-----|
| 远程 | `https://github.com/prompt-tools/agent-relay` |
| 最新 tag | `v0.3.0` |
| 默认分支 | `main` @ `0ba83cc` |

## 用户级 Cursor Memory（可选）

见仓库内 `docs/CURSOR-MEMORY.md` — 建议粘贴到 Cursor Settings → Rules/Memories。

## claude-mem

本仓库 **无** 独立 claude-mem 条目；项目记忆以 **`docs/MEMORY.md`** + **`docs/WORKLOG.md`** 为准。
