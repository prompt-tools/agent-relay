# Roadmap

> 状态以 `docs/FOCUS.md` 和 `docs/WORKLOG.md` 为准。

## Phase 0 — 研究定稿 ✅

- [x] 需求整合、否决联邦主路径
- [x] PRINCIPLES.md / FOCUS.md

## Phase 1 — v1 MVP ✅

- [x] 对称 send/receive 协议 v2
- [x] relayd + hermes-cli provider
- [x] MCP relay_send / relay_receive
- [x] relay setup（OAuth、launchd、MCP 合并）
- [x] cursor → hermes E2E 实测
- [x] project.yaml 路由
- [x] MEMORY / WORKLOG / AGENTS.md
- [x] GitHub 发布 `v0.1.0` tag + Release
- [x] 本机 `~/.agent-relay` 长期运行验证（PROD2 OK）

## Phase 2 — 体验加固

- [x] cursor-agent provider（反向唤醒）
- [x] 失败自动重试（`relayd.retries.json` + `handleWakeFailure`）
- [x] `relay recover` — 卡住任务回 pending
- [x] `relay health` / `relay status --health` 一键诊断（含 `stuckActive`）
- [ ] setup 图形化或 TUI
- [ ] `type:progress` 可观测面板

## Phase 3 — 可选扩展

- [ ] antigravity-cli provider
- [ ] `relay serve` 自托管 Web 面板
- [ ] 跨机（git/rsync 队列同步）

## 不做

见 `docs/PRINCIPLES.md`「明确不做」。
