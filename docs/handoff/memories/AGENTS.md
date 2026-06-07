# AGENTS.md

给在本仓库工作的 AI Agent 的**入口指针**。细则真源：**`docs/AGENT-CONTRACT.md`**。

## 先读（顺序）

1. **`using-superpowers`**
2. **`docs/AGENT-CONTRACT.md`** — S/M/L 档位、Research-First（L 档）、Hermes §0.3
3. **`docs/MEMORY.md`** — 决策与踩坑
4. `docs/PRINCIPLES.md` · `docs/WORKLOG.md`

## 三句话

- 产品：**send / receive** + **relayd** 唤醒；主 E2E **cursor → hermes**
- 编排：**Superpowers + Cursor Subagent**；Hermes 回传 **必须 code-reviewer**
- 完成：**npm test** fresh pass + 更新 **MEMORY + WORKLOG**

## 常用命令

见 `docs/OPERATIONS.md` 或 `README.md`。
