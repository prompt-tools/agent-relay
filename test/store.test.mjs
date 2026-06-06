import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask, completeTask, pullInbox } from '../src/store.mjs';

test('send → claim → complete → pull', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-'));
  try {
    const config = initConfig(home, 'cursor');
    const task = sendTask(config, {
      to: 'hermes',
      from: 'cursor',
      title: 'Test',
      planMarkdown: '## Do thing',
    });
    assert.equal(task.status, 'pending');
    const claimed = claimTask(config, 'hermes', task.id);
    assert.equal(claimed.status, 'active');
    const result = completeTask(config, 'hermes', task.id, { summary: 'ok' });
    assert.equal(result.status, 'completed');
    const inbox = pullInbox(config, 'cursor');
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].taskId, task.id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
