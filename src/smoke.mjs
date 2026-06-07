import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layout } from './paths.mjs';
import { sendTask, receiveTasks } from './store.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findResultForTask(home, taskId) {
  const dir = layout(home).pending('cursor');
  if (!existsSync(dir)) return null;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const task = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    if (task.type === 'result' && task.taskId === taskId) return task;
  }
  return null;
}

function planDone(home, node, taskId) {
  return existsSync(join(layout(home).done(node), `${taskId}.json`));
}

/**
 * Live smoke: send minimal plan → hermes → wait for result on cursor pending.
 * Requires relayd + hermes CLI on this machine.
 */
export async function runLiveSmoke(config, options = {}) {
  const {
    projectPath = process.cwd(),
    from = 'cursor',
    to = 'hermes',
    marker = 'PROD3 OK',
    timeoutSec = 120,
    pollSec = 2,
  } = options;

  const plan = sendTask(config, {
    type: 'plan',
    to,
    from,
    projectPath,
    title: 'relay-smoke',
    body: {
      markdown: `## 只回复 ${marker} 并执行 prompt 末尾 relay send 回传`,
    },
  });

  const started = Date.now();
  const deadline = started + timeoutSec * 1000;

  while (Date.now() < deadline) {
    await sleep(pollSec * 1000);
    const result = findResultForTask(config.home, plan.id);
    if (result) {
      const elapsedMs = Date.now() - started;
      return {
        ok: true,
        planId: plan.id,
        resultId: result.id,
        summary: result.body?.summary,
        elapsedMs,
        planArchived: planDone(config.home, to, plan.id),
      };
    }
  }

  return {
    ok: false,
    planId: plan.id,
    error: `timeout after ${timeoutSec}s waiting for result on pending/cursor`,
    planArchived: planDone(config.home, to, plan.id),
    pendingResults: receiveTasks(config, from, { type: 'result' }).length,
  };
}
