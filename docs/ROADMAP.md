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
- [x] setup 图形化或 TUI
- [x] `type:progress` 可观测（`relay watch` CLI）
- [x] GitHub 发布 `v0.2.0` tag + Release

## Phase 3 — 可选扩展

- [x] antigravity-cli provider
- [x] `relay serve` 自托管 Web 面板

## 当前优先级（本机）

- [x] **本机 E2E CI 闭环** — `test/e2e-relayd.test.mjs` + `npm test` 62/62
- [x] **本机 live smoke 可重复** — `relay smoke`；实测 **PROD3 OK** ~12s（2026-06-07）
- [x] `relay health` 无 orphan

单机 Phase 3 功能已齐；**验收本机闭环** 后再做其它。

## 封存 — 最后做

- [ ] 跨机（git/rsync 队列同步）— 调研/设计/计划已就绪，**代码未开工**  
  → [`docs/archive/cross-machine-sync/README.md`](archive/cross-machine-sync/README.md)

## 不做

见 `docs/PRINCIPLES.md`「明确不做」。
