import { existsSync, readFileSync } from 'node:fs';
import { layout } from './paths.mjs';
import { listTasks, status } from './store.mjs';

const WATCH_OPS = new Set(['wake_ok', 'wake_retry', 'send', 'claim']);
const LOG_TAIL_LINES = 100;
const RECENT_OPS_LIMIT = 10;
const RECENT_PROGRESS_LIMIT = 10;

function readRecentLogOps(home, limit = RECENT_OPS_LIMIT) {
  const logPath = layout(home).log;
  if (!existsSync(logPath)) return [];
  const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  return lines
    .slice(-LOG_TAIL_LINES)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && WATCH_OPS.has(entry.op))
    .slice(-limit);
}

function listActiveTasks(config) {
  const items = [];
  for (const node of config.nodes) {
    for (const task of listTasks(config, node, 'active')) {
      items.push({ ...task, node });
    }
  }
  return items.sort((a, b) => {
    const aTs = a.claimedAt || a.createdAt || '';
    const bTs = b.claimedAt || b.createdAt || '';
    return aTs < bTs ? 1 : -1;
  });
}

function listRecentProgressPending(config, limit = RECENT_PROGRESS_LIMIT) {
  const items = [];
  for (const node of config.nodes) {
    for (const task of listTasks(config, node, 'pending')) {
      if (task.type === 'progress') {
        items.push({ ...task, node });
      }
    }
  }
  return items
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export function buildWatchSnapshot(config) {
  const st = status(config);
  return {
    ts: new Date().toISOString(),
    home: st.home,
    nodeId: st.nodeId,
    counts: st.counts,
    active: listActiveTasks(config),
    progressPending: listRecentProgressPending(config),
    recentOps: readRecentLogOps(config.home),
  };
}

function formatOpLine(entry) {
  const parts = [entry.ts || '?', entry.op, entry.id || '-'];
  if (entry.pid != null) parts.push(`pid=${entry.pid}`);
  if (entry.attempt != null) parts.push(`attempt=${entry.attempt}`);
  if (entry.type) parts.push(`type=${entry.type}`);
  if (entry.from) parts.push(`${entry.from}→${entry.to || '?'}`);
  return `  ${parts.join(' ')}`;
}

export function formatWatchText(snapshot) {
  const lines = [];
  lines.push('agent-relay watch');
  lines.push(`home: ${snapshot.home}  node: ${snapshot.nodeId}  at: ${snapshot.ts}`);
  lines.push('');
  lines.push('── status counts ──');
  for (const [node, buckets] of Object.entries(snapshot.counts)) {
    const { pending, active, done, failed } = buckets;
    lines.push(`  ${node}: pending=${pending} active=${active} done=${done} failed=${failed}`);
  }
  lines.push('');
  lines.push('── active tasks ──');
  if (!snapshot.active.length) {
    lines.push('  (none)');
  } else {
    for (const task of snapshot.active) {
      lines.push(
        `  [${task.node}] ${task.id} ${task.type} ${task.from ?? '-'}→${task.to ?? '-'} ${task.title ?? '(no title)'}`,
      );
    }
  }
  lines.push('');
  lines.push('── recent progress (pending) ──');
  if (!snapshot.progressPending.length) {
    lines.push('  (none)');
  } else {
    for (const task of snapshot.progressPending) {
      lines.push(
        `  [${task.node}] ${task.id} taskId=${task.taskId || '-'} ${task.title ?? '(no title)'}`,
      );
    }
  }
  lines.push('');
  lines.push('── recent relay.log ops ──');
  if (!snapshot.recentOps.length) {
    lines.push('  (none)');
  } else {
    for (const entry of snapshot.recentOps) {
      lines.push(formatOpLine(entry));
    }
  }
  return lines.join('\n');
}

export function runWatch(config, { intervalSec = 5, once = false, json = false } = {}) {
  const emit = () => {
    try {
      const snapshot = buildWatchSnapshot(config);
      if (json) {
        console.log(JSON.stringify(snapshot, null, 2));
        return;
      }
      if (!once && process.stdout.isTTY) {
        process.stdout.write('\x1b[2J\x1b[H');
      }
      console.log(formatWatchText(snapshot));
    } catch (err) {
      console.error(`[watch] error: ${err.message}`);
    }
  };

  emit();
  if (once) return null;
  return setInterval(emit, intervalSec * 1000);
}
