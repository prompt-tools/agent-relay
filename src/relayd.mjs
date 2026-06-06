import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout } from './paths.mjs';
import { loadConfig } from './config.mjs';
import { listTasks, claimTask } from './store.mjs';
import { getProvider } from './nodes.mjs';
import { buildCodexSpawn } from './providers/codex.mjs';
import { buildHermesSpawn } from './providers/hermes.mjs';

const RELAY_BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'relay.js');

const PROVIDERS = {
  'codex-exec': buildCodexSpawn,
  'hermes-cli': buildHermesSpawn,
};

export function loadProcessed(home) {
  const p = layout(home).relaydProcessed;
  if (!existsSync(p)) return new Set();
  const data = JSON.parse(readFileSync(p, 'utf8'));
  return new Set(data.processed || []);
}

export function saveProcessed(home, set) {
  const p = layout(home).relaydProcessed;
  writeFileSync(p, JSON.stringify({ processed: [...set] }, null, 2) + '\n', { mode: 0o600 });
}

export function acquireLock(home) {
  const pidFile = layout(home).relaydPid;
  if (existsSync(pidFile)) {
    const old = Number(readFileSync(pidFile, 'utf8').trim());
    try {
      process.kill(old, 0);
      return false;
    } catch {
      unlinkSync(pidFile);
    }
  }
  writeFileSync(pidFile, String(process.pid), { mode: 0o600 });
  return true;
}

export function releaseLock(home) {
  const pidFile = layout(home).relaydPid;
  if (existsSync(pidFile)) unlinkSync(pidFile);
}

export function buildSpawnForTask(home, task) {
  const provider = getProvider(home, task.to);
  const build = PROVIDERS[provider];
  if (!build) return null;
  return build(task, { home, relayBin: RELAY_BIN });
}

export function wakeTask(home, task, { spawnFn = spawn } = {}) {
  const spec = buildSpawnForTask(home, task);
  if (!spec) return { woke: false, reason: 'manual or unknown provider' };
  const child = spawnFn(spec.cmd, spec.args, {
    detached: true,
    stdio: 'ignore',
    cwd: task.projectPath,
    env: { ...process.env, ...spec.env },
  });
  child.unref();
  return { woke: true, pid: child.pid, spec };
}

export function tick(home, { spawnFn = spawn } = {}) {
  const config = loadConfig(home);
  const nodeId = config.nodeId;
  const processed = loadProcessed(home);
  const pending = listTasks(config, nodeId, 'pending').filter((t) => t.type === 'plan');
  const results = [];

  for (const task of pending) {
    if (processed.has(task.id)) continue;
    try {
      claimTask(config, nodeId, task.id);
      const wake = wakeTask(home, task, { spawnFn });
      processed.add(task.id);
      saveProcessed(home, processed);
      results.push({ id: task.id, ...wake });
    } catch (err) {
      results.push({ id: task.id, woke: false, reason: err.message });
    }
  }
  return results;
}
