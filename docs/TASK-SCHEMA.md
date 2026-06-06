# Task Schema

> v2 对称协议：`send` 写 `pending/<to>/`；回传 = 再次 `send` 到原发送方。见 `PRINCIPLES.md`。

## 统一信封 `*.json`

```json
{
  "id": "20260607-001",
  "version": 2,
  "type": "plan",
  "from": "cursor",
  "to": "codex",
  "projectPath": "/Users/me/Projects/foo",
  "status": "pending",
  "createdAt": "2026-06-07T00:00:00.000Z",
  "title": "实现登录模块 E2E",
  "body": {
    "markdown": "## 背景\n...\n\n## 步骤\n1. ...",
    "acceptance": ["测试通过", "无 lint 错误"],
    "refs": {
      "files": ["src/auth.ts"],
      "branch": "feat/login"
    }
  },
  "replyTo": "cursor"
}
```

## 回传信封（同样是 send，写入 `pending/<from>/`）

```json
{
  "id": "20260607-002",
  "version": 2,
  "type": "result",
  "from": "codex",
  "to": "cursor",
  "projectPath": "/Users/me/Projects/foo",
  "taskId": "20260607-001",
  "status": "pending",
  "createdAt": "2026-06-07T01:30:00.000Z",
  "title": "Done",
  "body": {
    "summary": "E2E 已绿，改了 3 个文件",
    "artifacts": {
      "dir": "~/.agent-relay/artifacts/20260607-001",
      "files": ["summary.md", "test.log"]
    }
  },
  "replyTo": "cursor"
}
```

## type 枚举

| type | 含义 |
|------|------|
| `plan` | 派活计划 |
| `result` | 完成回传 |
| `failed` | 失败回传 |
| `progress` | 进度更新 |

## 状态机（本地执行侧）

```
pending → active（claim）→ 执行方 send(result|failed) 回传
```

- `relay send` → `pending/<to>/`
- `relay claim` → `active/<node>/`
- 回传无 inbox：接收方 `relay send <from> --type result --task-id <id>`

## ID 生成

`YYYYMMDD-HHmmss-<4hex>`，保证文件名可排序。
