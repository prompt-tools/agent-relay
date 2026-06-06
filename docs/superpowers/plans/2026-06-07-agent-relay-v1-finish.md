# agent-relay v1 收尾计划

> **执行技能:** subagent-driven-development，每 Task 后 spec + quality 审核，`npm test` 验证。

**Goal:** 补齐 FOCUS v1 清单第 4、6、7 项缺口，达到 PRINCIPLES UX 标准。

**剩余缺口:**
1. setup 缺 OAuth + 交互向导 + launchctl load
2. E2E 文档仍以 codex 为主，应改 Hermes
3. project.yaml 项目路由（PRINCIPLES 已定义）
4. relayd 失败可诊断（stderr 日志已有，补结构化错误）

---

### Task 8: OAuth 顺序登录

**Files:** `scripts/auth.mjs`, `scripts/setup.mjs`, `test/auth.test.mjs`

- receiver=hermes → 检测 `hermes status`，未配置则 `hermes login`
- sender=cursor → 跳过（Cursor IDE 已登录）；提示重启 Cursor
- codex/agy → 仅检测，不强制（用户无额度可跳过）

### Task 9: 交互向导 + launchd 加载

**Files:** `scripts/setup.mjs`, `scripts/launchd.mjs`, `test/setup.test.mjs`

- TTY 时 readline 问 role / nodeId
- 写 plist 后 `launchctl bootstrap gui/$UID`

### Task 10: project.yaml 路由

**Files:** `src/project.mjs`, `bin/relay.js`, `test/project.test.mjs`

- 读 `<repo>/.agent-relay/project.yaml` 的 `defaultTo`
- `relay send` 省略 `<to>` 时用项目默认

### Task 11: 文档 + 诊断

**Files:** `docs/E2E.md`, `docs/SETUP.md`, `src/relayd.mjs`

- E2E 主路径 cursor→hermes
- SETUP.md 一键流程
- relayd tick 失败写 relay.log 结构化条目
