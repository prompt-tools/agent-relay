# AGENTS.md

给在本仓库工作的 AI Agent 的指引。

## 先读这些

1. `docs/PRINCIPLES.md` — 不可丢原则
2. `docs/FOCUS.md` — v1 范围与已否决方向
3. `docs/MEMORY.md` — 项目经验与踩坑
4. `docs/WORKLOG.md` — 最近做了什么

## 架构一句话

文件队列 `~/.agent-relay/tasks/pending/<node>/`；**send** 写入，**receive** 列出；**relayd** 见 plan → claim → spawn provider CLI；回传 = 再次 **send**（`type:result`）。

## 开发约束

- Node ≥20 ESM，无额外运行时依赖
- 改协议先改 `src/schema.mjs` + 测试
- 新 provider 放 `src/providers/`，注册到 `src/relayd.mjs`
- CLI 与 MCP 必须同构（共用 `src/store.mjs`）
- 每步 `npm test`；声称完成前要有测试证据

## 默认 E2E

**cursor → hermes**（不是 codex，除非用户明确要求）。

## 技能流程

多步任务：
1. `writing-plans` → `docs/superpowers/plans/`
2. `subagent-driven-development` 执行
3. `verification-before-completion` 再声称完成

## 不要

- 恢复 inbox/pull/complete
- 引入 Ruflo 联邦为主路径
- 扩 scope 到四 provider 齐测 / Docker / 跨机
- 跳过测试或 memory/worklog 更新

## 常用命令

```bash
npm test
node bin/relay.js setup --role receiver --node hermes --yes
node bin/relay.js send hermes --from cursor --project . --title T --plan-text "## ..."
node bin/relay.js receive cursor --type result
```
