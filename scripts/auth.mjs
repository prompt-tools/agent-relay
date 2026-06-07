import { spawnSync } from 'node:child_process';
import { isCliReady, AUTH_COMMANDS } from '../src/detect.mjs';

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
