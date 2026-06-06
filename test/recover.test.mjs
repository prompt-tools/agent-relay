import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask } from '../src/store.mjs';
import { layout } from '../src/paths.mjs';
import { recoverTask, listStuckActive } from '../src/recover.mjs';

test('recoverTask moves active back to pending', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-recover-'));
  try {
    const config = initConfig(home, 'hermes');
    const plan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T',
      body: { markdown: 'x' },
    });
    claimTask(config, 'hermes', plan.id);
    const recovered = recoverTask(config, 'hermes', plan.id);
    assert.equal(recovered.status, 'pending');
    const onDisk = JSON.parse(
      readFileSync(join(layout(home).pending('hermes'), `${plan.id}.json`), 'utf8'),
    );
    assert.equal(onDisk.status, 'pending');
    assert.equal(onDisk.claimedAt, undefined);
    const stuck = listStuckActive(config, 'hermes');
    assert.equal(stuck.length, 0);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
