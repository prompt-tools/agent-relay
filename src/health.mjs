import { existsSync, readFileSync } from 'node:fs';
import { layout } from './paths.mjs';
import { loadConfig } from './config.mjs';
import { loadNodes } from './nodes.mjs';
import { detectClis } from '../scripts/setup.mjs';
import { isCliReady } from '../scripts/auth.mjs';
import { listStuckActive } from './recover.mjs';

export function checkRelayd(home) {
  const pidFile = layout(home).relaydPid;
  if (!existsSync(pidFile)) {
    return { ok: false, reason: 'relayd.pid missing' };
  }
  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  try {
    process.kill(pid, 0);
    return { ok: true, pid };
  } catch {
    return { ok: false, reason: 'stale pid file', pid };
  }
}

export function recentErrors(home, limit = 5) {
  const logPath = layout(home).log;
  if (!existsSync(logPath)) return [];
  const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  return lines
    .slice(-50)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((e) => e && (e.op === 'relayd_error' || e.error))
    .slice(-limit);
}

export function healthReport(home) {
  const config = loadConfig(home);
  const nodes = loadNodes(home);
  const detected = detectClis();
  const relayd = checkRelayd(home);
  const nodeId = config.nodeId;
  const provider = nodes.nodes?.[nodeId]?.provider || 'manual';
  const cliKey = detected.find((d) => d.nodeId === nodeId)?.key;
  const auth = cliKey ? isCliReady(cliKey) : { ready: false, reason: 'cli not detected' };

  const stuck = listStuckActive(config, nodeId, { olderThanMs: 60_000 });

  const checks = {
    home: layout(home).home,
    nodeId,
    provider,
    relayd,
    cli: cliKey ? { key: cliKey, ...auth } : { ready: false, reason: 'no matching cli' },
    stuckActive: stuck.map(({ task, age }) => ({ id: task.id, ageMs: age, title: task.title })),
    recentErrors: recentErrors(home),
  };

  const ok = relayd.ok && (provider === 'manual' || auth.ready);
  return { ok, checks };
}
