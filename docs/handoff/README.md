# Agent 交接包

> 生成时间：2026-06-07 · HEAD `0ba83cc` · 给接替 Agent 用

## 30 秒上手

1. 读 **[SESSION-SNAPSHOT.md](./SESSION-SNAPSHOT.md)** — 当前状态、已完成、待办
2. 读 **[INDEX.md](./INDEX.md)** — 全文档目录与阅读顺序
3. 真源：**`docs/AGENT-CONTRACT.md`** + **`docs/MEMORY.md`**
4. 验证：`npm test`（62/62）· `relay health` · 可选 `relay smoke --project .`

## 文件清单

| 文件 | 用途 |
|------|------|
| [SESSION-SNAPSHOT.md](./SESSION-SNAPSHOT.md) | 会话摘要、commit 链、待办、约定 |
| [INDEX.md](./INDEX.md) | 全仓库文档树 + 每文件一句话 |
| [EXTERNAL-PATHS.md](./EXTERNAL-PATHS.md) | 仓库外路径（~/.agent-relay、Cursor  transcript 等） |
| [agent-relay-handoff-2026-06-07.tar.gz](./agent-relay-handoff-2026-06-07.tar.gz) | 文档+规则+记忆 完整打包 |
| [memories/](./memories/) | 核心记忆文件副本（免解压） |

## 给新 Agent 的第一条消息（可复制）

```
项目：~/Projects/agent-relay（agent-relay v0.3.0 已发布）
先读：docs/handoff/SESSION-SNAPSHOT.md → docs/AGENT-CONTRACT.md → docs/MEMORY.md
本机 E2E 已验收（cursor→hermes）；跨机封存；Hermes 回传必须 code-reviewer（§0.3）
未完成低优：审计 Batch 3（删 deprecated CLI stub）
```
