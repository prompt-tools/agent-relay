# P0 分发就绪度计划

> 日期：2026-06-07 · 档位：M · 来源：分发就绪度审计

## 目标

修复 6 个 P0 阻塞项，使 agent-relay 可通过 npm 分发给外部用户。

## Task 1: 换 npm 包名 + 补 package.json 字段

**文件**：`package.json`

**改动**：
- `"name"` → `"@prompt-tools/agent-relay"`
- 加 `"author"`: `"Klaus Cao <mxnfsf@gmail.com>"`
- 加 `"repository"`: `"github:prompt-tools/agent-relay"`
- 加 `"homepage"`: `"https://github.com/prompt-tools/agent-relay#readme"`
- 加 `"bugs"`: `"https://github.com/prompt-tools/agent-relay/issues"`
- 加 `"files"`: `["bin/", "src/", "mcp/", "scripts/", "LICENSE", "README.md", "CHANGELOG.md"]`

**为什么 files 白名单这些**：`bin/` + `src/` + `mcp/` + `scripts/` 是运行时必需；`test/` 不需要（用户跑 npm test 用源码）；`.cursor/`、`docs/`、`AGENTS.md`、`.github/` 都是内部文件。

## Task 2: platform guard launchd

**文件**：`scripts/setup.mjs`、`scripts/launchd.mjs`

**改动**：

### setup.mjs

- `resolveBinaryPath()` 和 `commandExists()`：替换 `command -v` 为 Node.js `which` 实现（`execSync('which <binary>')`，或纯 Node 的 PATH 扫描）。`which` 在 macOS/Linux 通用；Windows 上用 `where`。
- `runSetup()` 的 `installLaunchd` 分支（L196-207）：包裹 `if (process.platform === 'darwin')`，非 macOS 跳过 launchd 并打印提示："relayd 未安装为系统服务，请手动运行 `relayd` 或配置 systemd"。

### launchd.mjs

- 文件本身不需要改（只在 macOS 上被调用），但 `loadLaunchd()` 加一个 platform guard：

```js
export function loadLaunchd(plistPath) {
  if (process.platform !== 'darwin') {
    throw new Error('launchd is macOS-only. On Linux, run relayd manually or use systemd.');
  }
  // ... existing code
}
```

## Task 3: README 英文化 + npm 安装文档

**文件**：`README.md`

**改动**：重写为英文为主，结构如下：

```markdown
# agent-relay

Local agent task relay: send plans from Cursor → relayd wakes Hermes → results sent back.

## Install

npm install -g @prompt-tools/agent-relay

## Quick Start

relay setup --role both --yes
relay health

## How It Works

[typical flow diagram]

## Commands

[table of commands]

## Prerequisites

- Node.js >= 20
- macOS: launchd (auto-configured)
- Linux: run `relayd` manually or configure systemd
- Optional: hermes CLI, cursor-agent CLI, codex CLI

## Docs

[links to docs/]

## License

MIT
```

原中文 README 内容移至 `docs/README-zh.md` 并在主 README 底部链接。

## Task 4: MCP 版本去硬编码

**文件**：`mcp/server.mjs`

**改动**：`version: '0.3.0'` 改为从 `package.json` 动态读取：

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
```

或用 `readFileSync` + `JSON.parse`。

## 验收标准

- [ ] `npm pack --dry-run` 只包含 `bin/`、`src/`、`mcp/`、`scripts/`、`LICENSE`、`README.md`、`CHANGELOG.md`
- [ ] `npm test` 62/62 全绿
- [ ] `node bin/relay.js --help` 正常输出
- [ ] `grep -r 'command -v' scripts/` 无结果
- [ ] README 英文为主，有中文版链接
- [ ] mcp/server.mjs 无硬编码版本号

## 不做

- CI/CD workflow（P1）
- JSDoc（P1）
- 外部依赖文档（P1）
- Linux systemd unit（P2）
- Windows 支持（P2）
