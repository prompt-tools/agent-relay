import {
  readFileSync,
  renameSync,
  readdirSync,
  existsSync,
  openSync,
  closeSync,
  fsyncSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { layout, ensureLayout } from './paths.mjs';
import { assertNode } from './config.mjs';
import { validateEnvelope } from './schema.mjs';
import { appendLog } from './log.mjs';

function atomicWriteJson(filePath, data) {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = `${filePath}.tmp.${process.pid}`;
  const text = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(tmp, text, { mode: 0o600 });
  const fd = openSync(tmp, 'r+');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, filePath);
}



function taskFileName(id) {
  return `${id}.json`;
}

/** Generate a timestamp-based task ID (YYYYMMDDHHmmss-xxxxxxxx). */
function newTaskId() {
  const ts = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  return `${ts}-${randomBytes(4).toString('hex')}`;
}

/**
 * Create a task envelope and write it to the target node's pending queue.
 * @param {object} config - Relay config from loadConfig()
 * @param {object} input - Task input
 * @param {string} [input.type='plan'] - Task type (plan or result)
 * @param {string} input.to - Target node id
 * @param {string} input.from - Sender node id
 * @param {string} input.projectPath - Absolute path to the project
 * @param {string} [input.title] - Task title
 * @param {object} [input.body={}] - Task body payload
 * @param {string} [input.taskId] - Related task id (for results)
 * @returns {object} The validated task envelope
 */
export function sendTask(config, input) {
  const {
    type = 'plan',
    to,
    from,
    projectPath,
    title,
    body = {},
    taskId,
  } = input;

  assertNode(config, to);
  assertNode(config, from);
  ensureLayout(config.home);
  const p = layout(config.home);
  const id = newTaskId();
  const file = join(p.pending(to), taskFileName(id));
  if (existsSync(file)) throw new Error(`Task id collision: ${id}`);

  const task = validateEnvelope({
    id,
    version: 2,
    type,
    from,
    to,
    projectPath,
    status: 'pending',
    createdAt: new Date().toISOString(),
    title: title || 'Untitled task',
    body,
    ...(taskId ? { taskId } : {}),
    replyTo: from,
  });

  atomicWriteJson(file, task);
  appendLog(config.home, { op: 'send', id, type, from, to });
  if (type === 'result' && taskId) {
    archivePlanOnResult(config, from, taskId);
  }
  return task;
}

/** Move executor's claimed plan active → done when result arrives (internal; not a CLI primitive). */
function archivePlanOnResult(config, executorNode, taskId) {
  assertNode(config, executorNode);
  const p = layout(config.home);
  const src = join(p.active(executorNode), taskFileName(taskId));
  if (!existsSync(src)) return null;
  const dst = join(p.done(executorNode), taskFileName(taskId));
  mkdirSync(dirname(dst), { recursive: true, mode: 0o700 });
  try {
    renameSync(src, dst);
  } catch (err) {
    // 归档失败不应阻塞流程，但必须记录
    appendLog(config.home, { op: 'archive_failed', id: taskId, error: err.message });
    return null;
  }
  const task = readJson(dst);
  task.status = 'done';
  task.completedAt = new Date().toISOString();
  atomicWriteJson(dst, task);
  appendLog(config.home, { op: 'archive', id: taskId, node: executorNode });
  return task;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listTaskFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json'));
}

function findTaskFile(config, id) {
  const p = layout(config.home);
  for (const node of config.nodes) {
    for (const bucket of ['pending', 'active', 'done', 'failed']) {
      for (const name of [taskFileName(id)]) {
        const f = join(p.tasks, bucket, node, name);
        if (existsSync(f)) return { bucket, node, path: f };
      }
    }
  }
  return null;
}

/**
 * List tasks in a given bucket for a node.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {string} [status='pending'] - Bucket: pending, active, done, failed
 * @returns {object[]} Task envelopes sorted by createdAt descending
 */
export function listTasks(config, node, status = 'pending') {
  assertNode(config, node);
  const p = layout(config.home);
  const dir = join(p.tasks, status, node);
  return listTaskFiles(dir)
    .map((f) => readJson(join(dir, f)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * List pending tasks for a node, optionally filtered by type.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {{type?: string}} [opts] - Filter options
 * @returns {object[]} Pending task envelopes
 */
export function receiveTasks(config, node, { type } = {}) {
  const tasks = listTasks(config, node, 'pending');
  if (!type) return tasks;
  return tasks.filter((t) => t.type === type);
}

/**
 * Move a pending task to active (claim it for execution).
 * If no id given, claims the oldest pending task.
 * @param {object} config - Relay config
 * @param {string} node - Node id
 * @param {string} [id] - Specific task id, or omit for oldest
 * @returns {object} The claimed task envelope
 * @throws {Error} If no pending tasks or claim fails
 */
export function claimTask(config, node, id) {
  assertNode(config, node);
  const p = layout(config.home);
  let src;
  if (id) {
    src = join(p.pending(node), taskFileName(id));
  } else {
    const pending = listTasks(config, node, 'pending');
    if (!pending.length) throw new Error(`No pending tasks for ${node}`);
    id = pending[0].id;
    src = join(p.pending(node), taskFileName(id));
  }
  const dst = join(p.active(node), taskFileName(id));
  if (!existsSync(src)) throw new Error(`Task not pending: ${id}`);
  mkdirSync(dirname(dst), { recursive: true, mode: 0o700 });
  try {
    renameSync(src, dst);
  } catch {
    throw new Error(`Claim failed (already taken?): ${id}`);
  }
  const task = readJson(dst);
  task.status = 'active';
  task.claimedAt = new Date().toISOString();
  atomicWriteJson(dst, task);
  appendLog(config.home, { op: 'claim', id, node });
  return task;
}

/**
 * Return task counts per node per bucket.
 * @param {object} config - Relay config
 * @returns {{home: string, nodeId: string, counts: object}} Status summary
 */
export function status(config) {
  ensureLayout(config.home);
  const p = layout(config.home);
  const counts = {};
  for (const node of config.nodes) {
    counts[node] = {};
    for (const st of ['pending', 'active', 'done', 'failed']) {
      const dir = join(p.tasks, st, node);
      counts[node][st] = existsSync(dir) ? listTaskFiles(dir).length : 0;
    }
  }
  return { home: p.home, nodeId: config.nodeId, counts };
}

/**
 * Find and return a task by id across all buckets and nodes.
 * @param {object} config - Relay config
 * @param {string} id - Task id
 * @returns {{bucket: string, node: string, path: string, task: object}} Task location and data
 * @throws {Error} If task not found
 */
export function showTask(config, id) {
  const found = findTaskFile(config, id);
  if (!found) throw new Error(`Task not found: ${id}`);
  return { ...found, task: readJson(found.path) };
}
