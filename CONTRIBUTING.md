# Contributing

## 开发环境

```bash
git clone <repo>
cd agent-relay
npm test
```

要求：Node.js ≥ 20。

## 流程

1. 读 `docs/PRINCIPLES.md`、`docs/MEMORY.md`
2. 多步功能先写计划：`docs/superpowers/plans/`
3. 实现 + 测试（`npm test`）
4. 更新 `docs/WORKLOG.md` 与 `CHANGELOG.md`
5. PR 描述含测试证据

## 代码约定

- ESM（`.mjs`）
- 新 provider → `src/providers/` + 测试
- 不引入重量级依赖（v1 保持零 npm 运行时依赖）

## 报告问题

请附：

- `relay status` 输出
- `~/.agent-relay/relay.log` 相关行
- `relayd.stderr.log`（如有）
