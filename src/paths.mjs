import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

/**
 * Expand ~ to the OS home directory.
 * @param {string} p - Path that may start with ~
 * @returns {string} Absolute path
 */
function expandHome(p) {
  if (!p || p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Resolve the agent-relay home directory from explicit arg, env, or default.
 * @param {string} [explicit] - Explicit home path
 * @returns {string} Absolute path to relay home
 */
export function resolveHome(explicit) {
  return expandHome(explicit || process.env.AGENT_RELAY_HOME || '~/.agent-relay');
}

/**
 * Return the directory layout object for a given home.
 * @param {string} [home] - Override relay home
 * @returns {object} Layout with paths and bucket accessors
 */
export function layout(home) {
  const h = resolveHome(home);
  return {
    home: h,
    config: join(h, 'config.json'),
    nodes: join(h, 'nodes.json'),
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

/**
 * Create all required directories under home if they don't exist.
 * @param {string} [home] - Override relay home
 * @returns {object} Layout object
 */
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
  return p;
}
