import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig, loadConfig } from '../src/config.mjs';
import { sendTask, listTasks, receiveTasks } from '../src/store.mjs';
import { setNode } from '../src/nodes.mjs';
import { tick } from '../src/relayd.mjs';

test('relayd e2e: plan wake → fake executor result → cursor inbox + plan done', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-e2e-'));
  try {
    initConfig(home, 'hermes');
    setNode(home, 'hermes', { provider: 'hermes-cli', binary: 'hermes' });
    const config = loadConfig(home);

    sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'E2E',
      body: { markdown: 'reply E2E OK' },
    });

    const fakeSpawn = () => {
      const cfg = loadConfig(home);
      const active = listTasks(cfg, 'hermes', 'active');
      assert.equal(active.length, 1);
      const plan = active[0];
      sendTask(cfg, {
        type: 'result',
        to: plan.from,
        from: 'hermes',
        projectPath: plan.projectPath,
        taskId: plan.id,
        title: 'Done',
        body: { summary: 'e2e ok' },
      });
      return { unref() {}, on() {}, pid: 4242 };
    };

    const results = tick(home, { spawnFn: fakeSpawn });
    assert.equal(results.length, 1);
    assert.equal(results[0].woke, true);

    const done = listTasks(config, 'hermes', 'done');
    assert.equal(done.length, 1);
    assert.equal(done[0].status, 'done');

    const resultsInbox = receiveTasks(config, 'cursor', { type: 'result' });
    assert.equal(resultsInbox.length, 1);
    assert.equal(resultsInbox[0].body.summary, 'e2e ok');
    assert.equal(resultsInbox[0].taskId, done[0].id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
