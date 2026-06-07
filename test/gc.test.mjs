import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask, listTasks } from '../src/store.mjs';
import { saveProcessed } from '../src/relayd.mjs';
import { listOrphanPendingPlans, gcOrphanPendingPlans } from '../src/gc.mjs';

test('listOrphanPendingPlans finds processed pending duplicates', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-gc-'));
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
    saveProcessed(home, new Set([plan.id]));
    const orphans = listOrphanPendingPlans(config);
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0].id, plan.id);
    assert.equal(orphans[0].node, 'hermes');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('gcOrphanPendingPlans dry-run does not delete', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-gc-'));
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
    saveProcessed(home, new Set([plan.id]));
    const result = gcOrphanPendingPlans(config, { dryRun: true });
    assert.equal(result.removed.length, 0);
    assert.equal(result.orphans.length, 1);
    assert.ok(existsSync(result.orphans[0].path));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('gcOrphanPendingPlans removes orphan only', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-gc-'));
  try {
    const config = initConfig(home, 'hermes');
    const orphan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'orphan',
      body: { markdown: 'x' },
    });
    const legit = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'legit',
      body: { markdown: 'y' },
    });
    saveProcessed(home, new Set([orphan.id]));
    const result = gcOrphanPendingPlans(config, { dryRun: false });
    assert.equal(result.removed.length, 1);
    assert.equal(result.removed[0].id, orphan.id);
    const pending = listTasks(config, 'hermes', 'pending');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, legit.id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('gcOrphanPendingPlans does not remove unprocessed pending', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-gc-'));
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
    const result = gcOrphanPendingPlans(config, { dryRun: false });
    assert.equal(result.removed.length, 0);
    claimTask(config, 'hermes', plan.id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
