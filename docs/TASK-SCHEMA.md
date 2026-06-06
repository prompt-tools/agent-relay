# Task Schema

## 任务信封 `*.plan.json`

```json
{
  "id": "20260607-001",
  "version": 1,
  "from": "cursor",
  "to": "hermes",
  "status": "pending",
  "createdAt": "2026-06-07T00:00:00.000Z",
  "title": "实现登录模块 E2E",
  "plan": {
    "markdown": "## 背景\n...\n\n## 步骤\n1. ...\n2. ...",
    "acceptance": ["测试通过", "无 lint 错误"],
    "refs": {
      "files": ["~/Projects/foo/src/auth.ts"],
      "memoryKeys": ["federation-setup-2026-06"],
      "branch": "feat/login"
    }
  },
  "replyTo": "cursor"
}
```

## 回传信封 `*.result.json`（写入 `inbox/<replyTo>/`）

```json
{
  "taskId": "20260607-001",
  "from": "hermes",
  "to": "cursor",
  "status": "completed",
  "completedAt": "2026-06-07T01:30:00.000Z",
  "summary": "E2E 已绿，改了 3 个文件",
  "artifacts": {
    "dir": "~/.agent-relay/artifacts/20260607-001",
    "files": ["summary.md", "test.log"],
    "memoryKeys": []
  },
  "blockers": []
}
```

## 状态机

```
pending → active → completed | failed
```

- `relay send` → `pending`
- `relay claim` → `active`
- `relay complete` → `done/` + `inbox/<replyTo>/`
- `relay fail` → `failed/` + inbox 带 `blockers`

## ID 生成

`YYYYMMDD-HHmmss-<4hex>` 或 ULID，保证文件名可排序。
