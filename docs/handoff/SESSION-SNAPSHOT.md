# 会话快照（接替 Agent 用）

> 从 Cursor 会话 `27cbf5fa-6645-444a-b1b1-f0b0921dbb08` 提炼 · 2026-06-07

## 项目是什么

**agent-relay** — 本机 Agent 任务邮政局：对称 `relay send` / `relay receive`，`relayd` 按 `nodes.yaml` 唤醒 provider（Hermes / cursor-agent / codex / antigravity），做完再 `send` 回传。

- 仓库：`~/Projects/agent-relay`
- 运行时数据：`~/.agent-relay`（receiver=hermes，sender=cursor MCP）
- 版本：**v0.3.0** 已 tag + GitHub Release
- 测试：**62/62** `npm test`；live `relay smoke` PROD3 OK ~12s

## 用户核心诉求（按时间）

1. Research-First 全链路自主推进（调研→审→设计→审→计划→审→实现→再审）
2. **跨机同步**：调研/设计/计划已完成，**封存**，本机先用好
3. **本机目标**：cursor → hermes → cursor 邮政局可用、可重复验收 ✅
4. **Hermes 派活**：外部执行 + **第三方 code-reviewer 必审**，通过后自主 push/release
5. **全仓审计**：CodeGraph 已 init；Batch 1/2 完成；文档+MEMORY 已同步（`0ba83cc`）

## 当前状态（2026-06-07 末）

| 项 | 状态 |
|----|------|
| 本机 E2E CI | ✅ `test/e2e-relayd.test.mjs` |
| live smoke | ✅ `relay smoke --project .` |
| orphan pending | ✅ `relay gc` + `health.orphanPendingPlans` |
| v0.3.0 发布 | ✅ tag + Release |
| 全仓审计 Batch 1 | ✅ PROMPTS v2、config.example.json、MCP 0.3.0、RELIABILITY |
| 全仓审计 Batch 2 | ✅ CONTRACT S/M/L、AGENTS/rule 瘦身、MEMORY/WORKLOG 同步 |
| 全仓审计 Batch 3 | ⏸ 删 deprecated CLI stub、合并 relayLog（**低优，未做**） |
| 跨机 sync | ⏸ 文档就绪，**代码未开工** |

## 关键 commit 链（近 20）

```
0ba83cc docs: 完成审计 Batch 2 — CONTRACT S/M/L、MEMORY 与引用对齐
2b045dd fix: PROMPTS.md CLI syntax after audit review
1679ebb audit batch1: PROMPTS v2, config.example, MCP version
9d9bc3d docs: full repo audit report and ignore .codegraph
24a007d docs: add OPERATIONS.md
2eda295 chore: release v0.3.0
91aca8b feat: relay smoke
6f3e075 feat: local E2E acceptance — relayd loop test, gc, plan archive
6427e53 docs: cross-machine sync research, design, pipeline
bb12a96 feat: relay serve
bae9c26 feat: antigravity-cli wake provider
93bbfab docs: add AGENT-CONTRACT
```

## 硬约定（不可忘）

1. **对称 send/receive**，无 inbox/pull/complete（deprecated stub 仍在，Batch 3 待删）
2. **主 E2E：cursor → hermes**（用户无 codex 额度）
3. **Hermes 回传 → code-reviewer 必审**（CONTRACT §0.3）→ 自主 push，**少问用户**
4. **变更档位 S/M/L**（CONTRACT §0.1）：小改 S 档一轮 review；L 档完整九步 Research-First
5. 完成声称前：**fresh `npm test`** + 更新 **MEMORY + WORKLOG**
6. **跨机封存** → `docs/archive/cross-machine-sync/`
7. **CodeGraph**：`.codegraph/` 本地索引，不入 git

## 待办（优先级）

1. （可选）审计 **Batch 3**：删 `relay pull|complete|fail` deprecated stub；合并 relayLog
2. （封存）跨机 sync — 恢复条件见 `docs/archive/cross-machine-sync/README.md`
3. 日常维护：`relay health` · `npm test` · 偶发 `relay smoke`

## 运维速查

```bash
cd ~/Projects/agent-relay
relay health
npm test                    # 期望 62/62
relay smoke --project .     # live E2E（需 hermes + relayd）
relay gc --yes              # 清理 orphan pending
docs/OPERATIONS.md          # 日常运维一页纸
```

## 文档阅读顺序（新会话）

1. `docs/handoff/README.md`（本目录）
2. `docs/AGENT-CONTRACT.md`
3. `docs/MEMORY.md`
4. `docs/PRINCIPLES.md`
5. `docs/WORKLOG.md`（尾部最新条目）
6. `docs/FOCUS.md` · `docs/ROADMAP.md`
7. 做功能前：`docs/OPERATIONS.md` · `docs/E2E.md` · `docs/PROMPTS.md`

## Cursor 会话 transcript（完整对话）

```
~/.cursor/projects/Users-klaus-Projects-agent-relay/agent-transcripts/
  27cbf5fa-6645-444a-b1b1-f0b0921dbb08/27cbf5fa-6645-444a-b1b1-f0b0921dbb08.jsonl
```

含 subagent 子会话；搜索关键词：`Hermes`、`audit`、`E2E`、`cross-machine`、`code-reviewer`。
