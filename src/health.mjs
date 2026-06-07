import { existsSync, readFileSync } from 'node:fs';
import { layout } from './paths.mjs';
import { loadConfig } from './config.mjs';
import { loadNodes } from './nodes.mjs';
import { detectClis, isCliReady } from './detect.mjs';
import { listStuckActive } from './recover.mjs';
import { listOrphanPendingPlans } from './gc.mjs';

/**
 * Check if the relayd daemon is running by probing its PID file.
 * @param {string} home - Relay home path
 * @returns {{ok: boolean, pid?: number, reason?: string}} Daemon status
 */
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

/**
 * Return recent error entries from the relay log.
 * @param {string} home - Relay home path
 * @param {number} [limit=5] - Max errors to return
 * @returns {object[]} Recent error log entries
 */
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

/**
 * Generate a full health report for the relay setup.
 * @param {string} [home] - Override relay home
 * @returns {{ok: boolean, checks: object}} Health report with detailed checks
 */
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
    orphanPendingPlans: listOrphanPendingPlans(config),
    recentErrors: recentErrors(home),
  };

  const ok = relayd.ok && (provider === 'manual' || auth.ready);
  return { ok, checks };
}
