import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask } from '../src/store.mjs';
import { layout } from '../src/paths.mjs';
import { buildWatchSnapshot, formatWatchText } from '../src/watch.mjs';

test('buildWatchSnapshot aggregates active, progress, counts, and log ops', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-watch-'));
  try {
    const config = initConfig(home, 'cursor');
    const plan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/proj',
      title: 'Plan task',
      body: { markdown: '## work' },
    });
    claimTask(config, 'hermes', plan.id);

    sendTask(config, {
      type: 'progress',
      to: 'cursor',
      from: 'hermes',
      projectPath: '/tmp/proj',
      taskId: plan.id,
      title: 'Half done',
      body: { percent: 50 },
    });

    const log = layout(home).log;
    writeFileSync(
      log,
      [
        JSON.stringify({ ts: '2026-06-07T10:00:00.000Z', op: 'noise', id: 'x' }),
        JSON.stringify({
          ts: '2026-06-07T10:00:01.000Z',
          op: 'wake_ok',
          id: plan.id,
          pid: 4242,
        }),
        JSON.stringify({
          ts: '2026-06-07T10:00:02.000Z',
          op: 'send',
          id: 'prog1',
          type: 'progress',
          from: 'hermes',
          to: 'cursor',
        }),
      ].join('\n') + '\n',
      { mode: 0o600 },
    );

    const snapshot = buildWatchSnapshot(config);
    assert.equal(snapshot.nodeId, 'cursor');
    assert.equal(snapshot.counts.hermes.active, 1);
    assert.equal(snapshot.counts.cursor.pending, 1);
    assert.equal(snapshot.active.length, 1);
    assert.equal(snapshot.active[0].id, plan.id);
    assert.equal(snapshot.progressPending.length, 1);
    assert.equal(snapshot.progressPending[0].type, 'progress');
    assert.equal(snapshot.recentOps.length, 2);
    assert.deepEqual(
      snapshot.recentOps.map((e) => e.op),
      ['wake_ok', 'send'],
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('formatWatchText renders human-readable panel sections', () => {
  const snapshot = {
    ts: '2026-06-07T12:00:00.000Z',
    home: '/tmp/relay',
    nodeId: 'cursor',
    counts: { cursor: { pending: 1, active: 0, done: 0, failed: 0 } },
    active: [],
    progressPending: [
      {
        node: 'cursor',
        id: 'p1',
        taskId: 'plan1',
        title: 'Working',
      },
    ],
    recentOps: [{ ts: '2026-06-07T12:00:01.000Z', op: 'claim', id: 'plan1' }],
  };

  const text = formatWatchText(snapshot);
  assert.match(text, /agent-relay watch/);
  assert.match(text, /── status counts ──/);
  assert.match(text, /── active tasks ──/);
  assert.match(text, /── recent progress \(pending\) ──/);
  assert.match(text, /\[cursor\] p1 taskId=plan1 Working/);
  assert.match(text, /── recent relay.log ops ──/);
  assert.match(text, /claim plan1/);
});

test('buildWatchSnapshot returns empty ops when log missing', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-watch-'));
  try {
    const config = initConfig(home, 'hermes');
    const snapshot = buildWatchSnapshot(config);
    assert.deepEqual(snapshot.recentOps, []);
    assert.deepEqual(snapshot.active, []);
    assert.deepEqual(snapshot.progressPending, []);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
