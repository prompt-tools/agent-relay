import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout } from './paths.mjs';
import { loadConfig } from './config.mjs';
import { listTasks, claimTask } from './store.mjs';
import { getProvider, getNodeSpec } from './nodes.mjs';
import { recoverTask } from './recover.mjs';
import { appendLog } from './log.mjs';
import { buildCodexSpawn } from './providers/codex.mjs';
import { buildHermesSpawn } from './providers/hermes.mjs';
import { buildCursorSpawn } from './providers/cursor.mjs';
import { buildAntigravitySpawn } from './providers/antigravity.mjs';

const RELAY_BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'relay.js');
const MAX_RETRIES = 3;

const PROVIDERS = {
  'codex-exec': buildCodexSpawn,
  'hermes-cli': buildHermesSpawn,
  'cursor-agent': buildCursorSpawn,
  'antigravity-cli': buildAntigravitySpawn,
};



/**
 * Load the set of already-processed task ids from disk.
 * @param {string} home - Relay home path
 * @returns {Set<string>} Set of processed task ids
 */
export function loadProcessed(home) {
  const p = layout(home).relaydProcessed;
  if (!existsSync(p)) return new Set();
  const data = JSON.parse(readFileSync(p, 'utf8'));
  return new Set(data.processed || []);
}

/**
 * Persist the set of processed task ids to disk.
 * @param {string} home - Relay home path
 * @param {Set<string>} set - Processed task ids
 */
export function saveProcessed(home, set) {
  const p = layout(home).relaydProcessed;
  writeFileSync(p, JSON.stringify({ processed: [...set] }, null, 2) + '\n', { mode: 0o600 });
}

/**
 * Load the retry count map from disk.
 * @param {string} home - Relay home path
 * @returns {Object<string, number>} Map of task id to retry count
 */
export function loadRetries(home) {
  const p = layout(home).relaydRetries;
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, 'utf8')).retries || {};
}

/**
 * Persist the retry count map to disk.
 * @param {string} home - Relay home path
 * @param {Object<string, number>} retries - Map of task id to retry count
 */
export function saveRetries(home, retries) {
  const p = layout(home).relaydRetries;
  writeFileSync(p, JSON.stringify({ retries }, null, 2) + '\n', { mode: 0o600 });
}

/**
 * Acquire a PID lock file. Returns false if relayd is already running.
 * @param {string} home - Relay home path
 * @returns {boolean} True if lock acquired, false if already running
 */
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

/**
 * Release the PID lock file.
 * @param {string} home - Relay home path
 */
export function releaseLock(home) {
  const pidFile = layout(home).relaydPid;
  if (existsSync(pidFile)) unlinkSync(pidFile);
}

/**
 * Build the spawn command for a task based on the target node's provider.
 * @param {string} home - Relay home path
 * @param {object} task - Task envelope
 * @returns {{cmd: string, args: string[], env?: object}|null} Spawn spec or null
 */
export function buildSpawnForTask(home, task) {
  const provider = getProvider(home, task.to);
  const build = PROVIDERS[provider];
  if (!build) return null;
  const spec = getNodeSpec(home, task.to);
  return build(task, { home, relayBin: RELAY_BIN, binary: spec.binary });
}

/**
 * Spawn an external agent process to handle a claimed task.
 * @param {string} home - Relay home path
 * @param {object} task - Task envelope
 * @param {object} config - Relay config
 * @param {string} nodeId - Node id being woken
 * @param {{spawnFn?: Function}} [opts] - Override spawn function (for testing)
 * @returns {{woke: boolean, pid?: number, spec?: object, reason?: string}} Wake result
 */
export function wakeTask(home, task, config, nodeId, { spawnFn = spawn } = {}) {
  const spec = buildSpawnForTask(home, task);
  if (!spec) return { woke: false, reason: 'manual or unknown provider' };

  let spawnFailed = false;
  const child = spawnFn(spec.cmd, spec.args, {
    detached: true,
    stdio: 'ignore',
    cwd: task.projectPath,
    env: { ...process.env, ...spec.env },
  });

  child.on('error', (err) => {
    spawnFailed = true;
    appendLog(home, { op: 'spawn_error', id: task.id, cmd: spec.cmd, error: err.message });
    handleWakeFailure(home, config, nodeId, task.id, err.message);
  });

  child.unref();

  if (!child.pid) {
    return { woke: false, reason: 'spawn returned no pid', spec };
  }

  return { woke: true, pid: child.pid, spec, spawnFailed };
}

/**
 * Handle a wake failure by incrementing retry count and recovering the task.
 * @param {string} home - Relay home path
 * @param {object} config - Relay config
 * @param {string} nodeId - Node id
 * @param {string} taskId - Task id
 * @param {string} error - Error message
 */
export function handleWakeFailure(home, config, nodeId, taskId, error) {
  const retries = loadRetries(home);
  const count = (retries[taskId] || 0) + 1;
  retries[taskId] = count;
  saveRetries(home, retries);

  try {
    recoverTask(config, nodeId, taskId);
    const processed = loadProcessed(home);
    processed.delete(taskId);
    saveProcessed(home, processed);
    appendLog(home, { op: 'wake_retry', id: taskId, attempt: count, error });
  } catch (err) {
    appendLog(home, { op: 'recover_failed', id: taskId, error: err.message });
  }

  if (count >= MAX_RETRIES) {
    appendLog(home, { op: 'wake_give_up', id: taskId, attempts: count });
  }
}

/**
 * One poll cycle: find pending plans, claim them, wake agents.
 * @param {string} home - Relay home path
 * @param {{spawnFn?: Function}} [opts] - Override spawn function (for testing)
 * @returns {object[]} Results per processed task
 */
export function tick(home, { spawnFn = spawn } = {}) {
  const config = loadConfig(home);
  const nodeId = config.nodeId;
  const processed = loadProcessed(home);
  const retries = loadRetries(home);
  const pending = listTasks(config, nodeId, 'pending').filter((t) => t.type === 'plan');
  const results = [];

  for (const task of pending) {
    if (processed.has(task.id)) continue;
    if ((retries[task.id] || 0) >= MAX_RETRIES) {
      results.push({ id: task.id, woke: false, reason: 'max retries exceeded' });
      continue;
    }

    try {
      claimTask(config, nodeId, task.id);
      const wake = wakeTask(home, task, config, nodeId, { spawnFn });

      if (wake.woke && wake.pid) {
        processed.add(task.id);
        saveProcessed(home, processed);
        appendLog(home, { op: 'wake_ok', id: task.id, pid: wake.pid, provider: getProvider(home, task.to) });
      } else {
        handleWakeFailure(home, config, nodeId, task.id, wake.reason || 'wake failed');
      }

      results.push({ id: task.id, ...wake });
    } catch (err) {
      appendLog(home, { op: 'relayd_error', id: task.id, error: err.message });
      results.push({ id: task.id, woke: false, reason: err.message });
    }
  }
  return results;
}
