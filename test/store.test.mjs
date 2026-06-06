import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask, receiveTasks } from '../src/store.mjs';

test('send → claim → send result back', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-'));
  try {
    const config = initConfig(home, 'cursor');
    const plan = sendTask(config, {
      type: 'plan',
      to: 'codex',
      from: 'cursor',
      projectPath: '/tmp/proj',
      title: 'Test',
      body: { markdown: '## Do thing' },
    });
    assert.equal(plan.type, 'plan');
    assert.equal(plan.projectPath, '/tmp/proj');
    const claimed = claimTask(config, 'codex', plan.id);
    assert.equal(claimed.status, 'active');
    const result = sendTask(config, {
      type: 'result',
      to: 'cursor',
      from: 'codex',
      projectPath: '/tmp/proj',
      taskId: plan.id,
      title: 'Done',
      body: { summary: 'ok' },
    });
    assert.equal(result.type, 'result');
    const inbox = receiveTasks(config, 'cursor');
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].taskId, plan.id);
    assert.equal(inbox[0].body.summary, 'ok');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
