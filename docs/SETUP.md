# Setup 指南

## 一键（推荐）

```bash
cd ~/Projects/agent-relay
npm test

# 交互式（TTY 会问 role / nodeId，并按需跳浏览器登录）
relay setup

# 非交互（脚本化）
relay setup --role receiver --node hermes --yes --skip-auth
relay setup --role sender --node cursor --yes
```

## 角色说明

| 角色 | 做什么 | setup 行为 |
|------|--------|------------|
| `sender` | Cursor 发任务 | 写 nodes.yaml、合并 `~/.cursor/mcp.json` |
| `receiver` | Hermes 收任务 | 写 nodes.yaml、装 launchd、跑 relayd |
| `both` | 单机收发 | 以上全部 |

## OAuth / 登录

setup 按角色**顺序检查**（不强制四全家桶）：

| CLI | 何时检查 | 未登录时 |
|-----|----------|----------|
| `agent` (Cursor) | sender | 提示重启 Cursor（用 IDE 登录） |
| `hermes` | receiver=hermes | 交互模式运行 `hermes login` |
| `codex` | receiver=codex | 可选 `codex login`（可 `--skip-auth` 跳过） |

`--skip-auth`：只写配置，不打开浏览器。

## launchd

receiver 角色默认：

1. 写 `~/Library/LaunchAgents/com.agent-relay.relayd.plist`
2. `launchctl bootstrap` 加载

日志：

- `~/.agent-relay/relayd.stdout.log`
- `~/.agent-relay/relayd.stderr.log`

手动控制：

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.agent-relay.relayd.plist
relayd   # 前台调试
```

## 环境变量

| 变量 | 默认 |
|------|------|
| `AGENT_RELAY_HOME` | `~/.agent-relay` |
