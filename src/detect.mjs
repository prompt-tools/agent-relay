import { execSync } from 'node:child_process';

const CLI_CANDIDATES = {
  codex: { binary: 'codex', provider: 'codex-exec', nodeId: 'codex' },
  cursor: { binary: 'agent', provider: 'cursor-agent', nodeId: 'cursor' },
  hermes: { binary: 'hermes', provider: 'hermes-cli', nodeId: 'hermes' },
  antigravity: { binary: 'agy', provider: 'antigravity-cli', nodeId: 'antigravity' },
};

const AUTH_COMMANDS = {
  hermes: {
    check: ['hermes', 'status'],
    login: ['hermes', 'login'],
    readyPattern: /✓|authenticated|logged in/i,
  },
  codex: {
    check: ['codex', 'login', 'status'],
    login: ['codex', 'login'],
    readyPattern: /logged in|authenticated/i,
  },
  cursor: {
    check: ['agent', '--version'],
    login: null,
    readyPattern: /./,
    note: 'Cursor Agent uses IDE login; restart Cursor after MCP merge if needed.',
  },
};

function resolveBinaryPath(binary) {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    return execSync(`${cmd} ${binary}`, { encoding: 'utf8' }).trim();
  } catch {
    return binary;
  }
}

function commandExists(binary) {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${cmd} ${binary}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCapture(cmd, args) {
  try {
    const out = execSync([cmd, ...args].join(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: out, stderr: '' };
  } catch (err) {
    return { ok: false, stdout: err.stdout?.toString() || '', stderr: err.stderr?.toString() || err.message };
  }
}

export function detectClis() {
  const found = [];
  for (const [key, spec] of Object.entries(CLI_CANDIDATES)) {
    if (commandExists(spec.binary)) {
      found.push({ key, ...spec });
    }
  }
  return found;
}

export function isCliReady(key) {
  const spec = AUTH_COMMANDS[key];
  if (!spec) return { ready: false, reason: 'unknown cli' };
  const result = runCapture(spec.check[0], spec.check.slice(1));
  const text = `${result.stdout}\n${result.stderr}`;
  if (!result.ok && key !== 'cursor') {
    return { ready: false, reason: result.stderr || 'check failed' };
  }
  if (key === 'hermes') {
    const hasKey = /✓/.test(text) && /API Keys|Provider/i.test(text);
    return { ready: hasKey, reason: hasKey ? 'ok' : 'no API key configured' };
  }
  if (key === 'cursor') {
    return { ready: result.ok, reason: result.ok ? 'agent cli found' : 'agent not in PATH' };
  }
  return { ready: spec.readyPattern.test(text), reason: text.slice(0, 200) };
}

export { CLI_CANDIDATES, AUTH_COMMANDS, resolveBinaryPath };
