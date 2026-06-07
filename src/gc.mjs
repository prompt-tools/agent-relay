import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { layout } from './paths.mjs';
import { loadProcessed } from './relayd.mjs';
import { listTasks } from './store.mjs';

/** Pending plan files whose id is already in relayd.processed (stale duplicates). */
export function listOrphanPendingPlans(config) {
  const processed = loadProcessed(config.home);
  const orphans = [];
  for (const node of config.nodes) {
    const pending = listTasks(config, node, 'pending').filter((t) => t.type === 'plan');
    for (const task of pending) {
      if (processed.has(task.id)) {
        orphans.push({
          id: task.id,
          node,
          path: join(layout(config.home).pending(node), `${task.id}.json`),
        });
      }
    }
  }
  return orphans;
}

export function gcOrphanPendingPlans(config, { dryRun = false } = {}) {
  const orphans = listOrphanPendingPlans(config);
  if (dryRun) {
    return { dryRun: true, orphans, removed: [] };
  }
  const removed = [];
  for (const orphan of orphans) {
    if (existsSync(orphan.path)) {
      unlinkSync(orphan.path);
      removed.push(orphan);
    }
  }
  return { dryRun: false, orphans, removed };
}
