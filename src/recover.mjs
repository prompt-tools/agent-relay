import { existsSync, renameSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { layout } from './paths.mjs';
import { loadConfig } from './config.mjs';

function taskFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json'));
}

/**
 * List tasks stuck in the active bucket for a node.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {{olderThanMs?: number}} [opts] - Minimum age filter
 * @returns {{task: object, path: string, age: number}[]} Stuck tasks with metadata
 */
export function listStuckActive(config, node, { olderThanMs = 0 } = {}) {
  const dir = layout(config.home).active(node);
  const now = Date.now();
  return taskFiles(dir)
    .map((f) => {
      const path = join(dir, f);
      const task = JSON.parse(readFileSync(path, 'utf8'));
      const age = task.claimedAt ? now - Date.parse(task.claimedAt) : 0;
      return { task, path, age };
    })
    .filter(({ age }) => age >= olderThanMs);
}

/**
 * Move a single task from active back to pending for re-execution.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {string} taskId - Task id to recover
 * @returns {object} The recovered task envelope
 * @throws {Error} If task not found in active
 */
export function recoverTask(config, node, taskId) {
  const p = layout(config.home);
  const src = join(p.active(node), `${taskId}.json`);
  const dst = join(p.pending(node), `${taskId}.json`);
  if (!existsSync(src)) throw new Error(`Task not in active: ${taskId}`);
  const task = JSON.parse(readFileSync(src, 'utf8'));
  task.status = 'pending';
  delete task.claimedAt;
  renameSync(src, dst);
  writeFileSync(dst, JSON.stringify(task, null, 2) + '\n', { mode: 0o600 });
  return task;
}

/**
 * Recover all stuck active tasks for a node back to pending.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {{olderThanMs?: number}} [options] - Minimum age filter
 * @returns {object[]} Recovered task envelopes
 */
export function recoverAllStuck(config, node, options = {}) {
  const stuck = listStuckActive(config, node, options);
  const recovered = [];
  for (const { task } of stuck) {
    recovered.push(recoverTask(config, node, task.id));
  }
  return recovered;
}
