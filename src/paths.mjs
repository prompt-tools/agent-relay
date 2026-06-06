import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

export function expandHome(p) {
  if (!p || p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export function resolveHome(explicit) {
  return expandHome(explicit || process.env.AGENT_RELAY_HOME || '~/.agent-relay');
}

export function layout(home) {
  const h = resolveHome(home);
  return {
    home: h,
    config: join(h, 'config.json'),
    nodes: join(h, 'nodes.yaml'),
    relaydPid: join(h, 'relayd.pid'),
    relaydProcessed: join(h, 'relayd.processed.json'),
    relaydRetries: join(h, 'relayd.retries.json'),
    tasks: join(h, 'tasks'),
    pending: (node) => join(h, 'tasks', 'pending', node),
    active: (node) => join(h, 'tasks', 'active', node),
    done: (node) => join(h, 'tasks', 'done', node),
    failed: (node) => join(h, 'tasks', 'failed', node),
    artifacts: (id) => join(h, 'artifacts', id),
    log: join(h, 'relay.log'),
  };
}

export function ensureLayout(home) {
  const p = layout(home);
  for (const dir of [
    p.home,
    p.tasks,
    join(p.tasks, 'pending'),
    join(p.tasks, 'active'),
    join(p.tasks, 'done'),
    join(p.tasks, 'failed'),
    join(p.home, 'artifacts'),
  ]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  for (const node of ['cursor', 'codex', 'hermes', 'antigravity']) {
    for (const sub of ['pending', 'active', 'done', 'failed']) {
      const d = join(p.tasks, sub, node);
      if (!existsSync(d)) mkdirSync(d, { recursive: true, mode: 0o700 });
    }
  }
  return p;
}
