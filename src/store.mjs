import {
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  existsSync,
  openSync,
  closeSync,
  fsyncSync,
  appendFileSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { layout, ensureLayout } from './paths.mjs';
import { assertNode } from './config.mjs';

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

export function newTaskId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

export function sendTask(config, { to, from, title, planMarkdown, acceptance = [], refs = {} }) {
  assertNode(config, to);
  assertNode(config, from);
  ensureLayout(config.home);
  const p = layout(config.home);
  const id = newTaskId();
  const file = join(p.pending(to), `${id}.plan.json`);
  if (existsSync(file)) throw new Error(`Task id collision: ${id}`);
  const task = {
    id,
    version: 1,
    from,
    to,
    status: 'pending',
    createdAt: new Date().toISOString(),
    title: title || 'Untitled task',
    plan: {
      markdown: planMarkdown,
      acceptance,
      refs,
    },
    replyTo: from,
  };
  atomicWriteJson(file, task);
  appendLog(config.home, { op: 'send', id, from, to });
  return task;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function findTaskFile(config, id) {
  const p = layout(config.home);
  for (const node of config.nodes) {
    for (const bucket of ['pending', 'active', 'done', 'failed']) {
      const dir = join(p.tasks, bucket, node);
      const f = join(dir, `${id}.plan.json`);
      if (existsSync(f)) return { bucket, node, path: f };
    }
  }
  return null;
}

export function listTasks(config, node, status = 'pending') {
  assertNode(config, node);
  const p = layout(config.home);
  const dir = join(p.tasks, status, node);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.plan.json'))
    .map((f) => readJson(join(dir, f)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function claimTask(config, node, id) {
  assertNode(config, node);
  const p = layout(config.home);
  let src;
  if (id) {
    src = join(p.pending(node), `${id}.plan.json`);
  } else {
    const pending = listTasks(config, node, 'pending');
    if (!pending.length) throw new Error(`No pending tasks for ${node}`);
    id = pending[0].id;
    src = join(p.pending(node), `${id}.plan.json`);
  }
  const dst = join(p.active(node), `${id}.plan.json`);
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

function writeResult(config, task, result) {
  const p = layout(config.home);
  const inboxFile = join(p.inbox(task.replyTo), `${task.id}.result.json`);
  if (existsSync(inboxFile)) return readJson(inboxFile);
  atomicWriteJson(inboxFile, result);
  appendLog(config.home, { op: result.status, id: task.id, to: task.replyTo });
  return result;
}

export function completeTask(config, node, id, { summary, artifactsDir, files = [] }) {
  assertNode(config, node);
  const p = layout(config.home);
  const activePath = join(p.active(node), `${id}.plan.json`);
  const donePath = join(p.done(node), `${id}.plan.json`);
  if (existsSync(donePath)) {
    const existing = readJson(donePath);
    return writeResult(config, existing, {
      taskId: id,
      from: node,
      to: existing.replyTo,
      status: 'completed',
      completedAt: existing.completedAt,
      summary: existing.summary || summary,
      artifacts: existing.artifacts,
      blockers: [],
    });
  }
  if (!existsSync(activePath)) throw new Error(`Task not active: ${id}`);
  const task = readJson(activePath);
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  task.summary = summary;
  const art = artifactsDir || p.artifacts(id);
  const result = {
    taskId: id,
    from: node,
    to: task.replyTo,
    status: 'completed',
    completedAt: task.completedAt,
    summary,
    artifacts: { dir: art, files },
    blockers: [],
  };
  task.result = result;
  atomicWriteJson(donePath, task);
  if (existsSync(activePath)) unlinkSync(activePath);
  return writeResult(config, task, result);
}

export function failTask(config, node, id, reason) {
  assertNode(config, node);
  const p = layout(config.home);
  const activePath = join(p.active(node), `${id}.plan.json`);
  if (!existsSync(activePath)) throw new Error(`Task not active: ${id}`);
  const task = readJson(activePath);
  const failedPath = join(p.failed(node), `${id}.plan.json`);
  task.status = 'failed';
  task.failedAt = new Date().toISOString();
  const result = {
    taskId: id,
    from: node,
    to: task.replyTo,
    status: 'failed',
    completedAt: task.failedAt,
    summary: reason,
    artifacts: { dir: p.artifacts(id), files: [] },
    blockers: [reason],
  };
  task.result = result;
  atomicWriteJson(failedPath, task);
  if (existsSync(activePath)) unlinkSync(activePath);
  return writeResult(config, task, result);
}

export function pullInbox(config, node) {
  assertNode(config, node);
  const p = layout(config.home);
  const dir = p.inbox(node);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.result.json'))
    .map((f) => readJson(join(dir, f)))
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
}

export function status(config) {
  ensureLayout(config.home);
  const p = layout(config.home);
  const counts = {};
  for (const node of config.nodes) {
    counts[node] = {};
    for (const st of ['pending', 'active', 'done', 'failed']) {
      const dir = join(p.tasks, st, node);
      counts[node][st] = existsSync(dir)
        ? readdirSync(dir).filter((f) => f.endsWith('.plan.json')).length
        : 0;
    }
    const inboxDir = p.inbox(node);
    counts[node].inbox = existsSync(inboxDir)
      ? readdirSync(inboxDir).filter((f) => f.endsWith('.result.json')).length
      : 0;
  }
  return { home: p.home, nodeId: config.nodeId, counts };
}

export function showTask(config, id) {
  const found = findTaskFile(config, id);
  if (!found) throw new Error(`Task not found: ${id}`);
  return { ...found, task: readJson(found.path) };
}
