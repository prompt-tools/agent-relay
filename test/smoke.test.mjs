import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, listTasks } from '../src/store.mjs';
import { runLiveSmoke } from '../src/smoke.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('runLiveSmoke times out when no result', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-smoke-'));
  try {
    const config = initConfig(home, 'hermes');
    const result = await runLiveSmoke(config, {
      projectPath: '/tmp/p',
      timeoutSec: 2,
      pollSec: 1,
    });
    assert.equal(result.ok, false);
    assert.ok(result.planId);
    assert.match(result.error, /timeout/i);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('runLiveSmoke ok when hermes returns result', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-smoke-'));
  try {
    const config = initConfig(home, 'hermes');
    const smokePromise = runLiveSmoke(config, {
      projectPath: '/tmp/p',
      marker: 'SMOKE OK',
      timeoutSec: 10,
      pollSec: 1,
    });
    await sleep(1200);
    const pending = listTasks(config, 'hermes', 'pending');
    assert.equal(pending.length, 1);
    const planId = pending[0].id;
    sendTask(config, {
      type: 'result',
      to: 'cursor',
      from: 'hermes',
      projectPath: '/tmp/p',
      taskId: planId,
      title: 'Done',
      body: { summary: 'SMOKE OK' },
    });
    const result = await smokePromise;
    assert.equal(result.ok, true);
    assert.equal(result.summary, 'SMOKE OK');
    assert.equal(result.planId, planId);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
