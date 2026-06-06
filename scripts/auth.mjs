import { execSync, spawnSync } from 'node:child_process';

export const AUTH_COMMANDS = {
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

export function runCapture(cmd, args) {
  try {
    const out = execSync([cmd, ...args].join(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: out, stderr: '' };
  } catch (err) {
    return { ok: false, stdout: err.stdout?.toString() || '', stderr: err.stderr?.toString() || err.message };
  }
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

export function runLogin(key, { interactive = true } = {}) {
  const spec = AUTH_COMMANDS[key];
  if (!spec?.login) {
    return { ok: true, skipped: true, note: spec?.note };
  }
  const stdio = interactive ? 'inherit' : 'pipe';
  const result = spawnSync(spec.login[0], spec.login.slice(1), { stdio });
  return {
    ok: result.status === 0,
    status: result.status,
    error: result.error?.message,
  };
}

export function authPlan({ role, nodeId, detected }) {
  const keys = new Set();
  if (role === 'sender' || role === 'both') keys.add('cursor');
  if (role === 'receiver' || role === 'both') {
    const self = detected.find((d) => d.nodeId === nodeId);
    if (self) keys.add(self.key);
  }
  return [...keys];
}

export function runAuthSequence({ role, nodeId, detected, interactive = false, skipAuth = false }) {
  if (skipAuth) return { ok: true, steps: [{ step: 'auth', skipped: true }] };
  const plan = authPlan({ role, nodeId, detected });
  const steps = [];
  for (const key of plan) {
    const before = isCliReady(key);
    steps.push({ step: 'auth-check', key, ...before });
    if (before.ready) continue;
    if (!interactive) {
      steps.push({ step: 'auth-login', key, skipped: true, reason: 'not ready; run login manually' });
      continue;
    }
    const login = runLogin(key, { interactive: true });
    steps.push({ step: 'auth-login', key, ...login });
    const after = isCliReady(key);
    steps.push({ step: 'auth-verify', key, ...after });
  }
  return { ok: true, steps };
}
