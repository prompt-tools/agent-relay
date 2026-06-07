import {
  readFileSync,
  renameSync,
  readdirSync,
  existsSync,
  openSync,
  closeSync,
  fsyncSync,
  appendFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { layout, ensureLayout } from './paths.mjs';
import { assertNode } from './config.mjs';
import { validateEnvelope } from './schema.mjs';

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

function appendLog(home, entry) {
  const p = layout(home);
  appendFileSync(p.log, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', {
    flag: 'a',
    mode: 0o600,
  });
}

function taskFileName(id) {
  return `${id}.json`;
}

export function newTaskId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

export function sendTask(config, input) {
  const {
    type = 'plan',
    to,
    from,
    projectPath,
    title,
    body = {},
    taskId,
    acceptance = [],
    refs = {},
  } = input;

  const planMarkdown = input.planMarkdown ?? body.markdown;
  const legacyPlan = planMarkdown !== undefined;

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
    body: legacyPlan
      ? { markdown: planMarkdown, acceptance, refs, ...body }
      : body,
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
export function archivePlanOnResult(config, executorNode, taskId) {
  assertNode(config, executorNode);
  const p = layout(config.home);
  const src = join(p.active(executorNode), taskFileName(taskId));
  if (!existsSync(src)) return null;
  const dst = join(p.done(executorNode), taskFileName(taskId));
  if (!existsSync(join(p.done(executorNode), '..'))) ensureLayout(config.home);
  try {
    renameSync(src, dst);
  } catch {
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
  return readdirSync(dir).filter((f) => f.endsWith('.json') || f.endsWith('.plan.json'));
}

function findTaskFile(config, id) {
  const p = layout(config.home);
  for (const node of config.nodes) {
    for (const bucket of ['pending', 'active', 'done', 'failed']) {
      for (const name of [taskFileName(id), `${id}.plan.json`]) {
        const f = join(p.tasks, bucket, node, name);
        if (existsSync(f)) return { bucket, node, path: f };
      }
    }
  }
  return null;
}

export function listTasks(config, node, status = 'pending') {
  assertNode(config, node);
  const p = layout(config.home);
  const dir = join(p.tasks, status, node);
  return listTaskFiles(dir)
    .map((f) => readJson(join(dir, f)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function receiveTasks(config, node, { type } = {}) {
  const tasks = listTasks(config, node, 'pending');
  if (!type) return tasks;
  return tasks.filter((t) => t.type === type);
}

export function claimTask(config, node, id) {
  assertNode(config, node);
  const p = layout(config.home);
  let src;
  if (id) {
    src = join(p.pending(node), taskFileName(id));
    if (!existsSync(src)) src = join(p.pending(node), `${id}.plan.json`);
  } else {
    const pending = listTasks(config, node, 'pending');
    if (!pending.length) throw new Error(`No pending tasks for ${node}`);
    id = pending[0].id;
    src = join(p.pending(node), taskFileName(id));
    if (!existsSync(src)) src = join(p.pending(node), `${id}.plan.json`);
  }
  const dst = join(p.active(node), taskFileName(id));
  if (!existsSync(src)) throw new Error(`Task not pending: ${id}`);
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

export function showTask(config, id) {
  const found = findTaskFile(config, id);
  if (!found) throw new Error(`Task not found: ${id}`);
  return { ...found, task: readJson(found.path) };
}
