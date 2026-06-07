import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask, receiveTasks } from '../src/store.mjs';
import { setNode } from '../src/nodes.mjs';
import {
  buildSpawnForTask,
  loadProcessed,
  saveProcessed,
  tick,
  handleWakeFailure,
  loadRetries,
} from '../src/relayd.mjs';
import { buildSpawn } from '../src/providers/index.mjs';

const CTX = { home: '/tmp/relay-home', relayBin: '/app/bin/relay.js' };

test('buildSpawn codex-exec includes relay send tail', () => {
  const spec = buildSpawn(
    'codex-exec',
    { id: 't1', from: 'cursor', projectPath: '/tmp/p', body: { markdown: 'do work' } },
    CTX,
  );
  assert.equal(spec.cmd, 'codex');
  assert.ok(spec.args.join(' ').includes("send 'cursor'"));
  assert.ok(spec.args.join(' ').includes("--task-id 't1'"));
});

test('buildSpawn hermes-cli uses hermes chat -q', () => {
  const spec = buildSpawn(
    'hermes-cli',
    { id: 't2', from: 'cursor', projectPath: '/tmp/p', body: { markdown: 'ping' } },
    CTX,
  );
  assert.equal(spec.cmd, 'hermes');
  assert.equal(spec.args[0], 'chat');
  assert.equal(spec.args[1], '-q');
  assert.ok(spec.args[2].includes("send 'cursor'"));
  assert.ok(spec.args[2].includes("--task-id 't2'"));
  assert.ok(spec.args.includes('-Q'));
  assert.ok(spec.args.includes('--yolo'));
});

test('tick claims hermes plan and wakes', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const config = initConfig(home, 'hermes');
    setNode(home, 'hermes', { provider: 'hermes-cli', binary: 'hermes' });
    sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T',
      body: { markdown: 'x' },
    });
    const fakeSpawn = () => ({ unref() {}, on() {}, pid: 999 });
    const results = tick(home, { spawnFn: fakeSpawn });
    assert.equal(results.length, 1);
    assert.equal(results[0].woke, true);
    assert.ok(results[0].spec.cmd.includes('hermes'));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('tick claims antigravity plan and wakes', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const config = initConfig(home, 'antigravity');
    setNode(home, 'antigravity', { provider: 'antigravity-cli', binary: 'agy' });
    sendTask(config, {
      type: 'plan',
      to: 'antigravity',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T',
      body: { markdown: 'x' },
    });
    const fakeSpawn = () => ({ unref() {}, on() {}, pid: 999 });
    const results = tick(home, { spawnFn: fakeSpawn });
    assert.equal(results.length, 1);
    assert.equal(results[0].woke, true);
    assert.ok(results[0].spec.cmd.includes('agy'));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('tick claims plan and records processed', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const config = initConfig(home, 'codex');
    setNode(home, 'codex', { provider: 'codex-exec' });
    sendTask(config, {
      type: 'plan',
      to: 'codex',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T',
      body: { markdown: 'x' },
    });
    const fakeSpawn = () => ({ unref() {}, on() {}, pid: 999 });
    const results = tick(home, { spawnFn: fakeSpawn });
    assert.equal(results.length, 1);
    assert.equal(results[0].woke, true);
    const processed = loadProcessed(home);
    assert.equal(processed.size, 1);
    const again = tick(home, { spawnFn: fakeSpawn });
    assert.equal(again.length, 0);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('processed set persists', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const s = new Set(['a', 'b']);
    saveProcessed(home, s);
    const loaded = loadProcessed(home);
    assert.deepEqual([...loaded].sort(), ['a', 'b']);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('buildSpawnForTask returns cursor-agent spec', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    setNode(home, 'cursor', { provider: 'cursor-agent', binary: '/bin/agent' });
    const spec = buildSpawnForTask(home, {
      to: 'cursor',
      id: '1',
      from: 'hermes',
      projectPath: '/x',
      body: {},
    });
    assert.equal(spec.cmd, '/bin/agent');
    assert.ok(spec.args.includes('--print'));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('buildSpawnForTask returns antigravity-cli spec', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    setNode(home, 'antigravity', { provider: 'antigravity-cli', binary: 'agy' });
    const spec = buildSpawnForTask(home, {
      to: 'antigravity',
      id: 'ag1',
      from: 'cursor',
      projectPath: '/x',
      body: { markdown: 'run it' },
    });
    assert.equal(spec.cmd, 'agy');
    assert.equal(spec.args[0], '-p');
    assert.ok(spec.args[1].includes('run it'));
    assert.ok(spec.args[1].includes("send 'cursor'"));
    assert.equal(spec.args[2], '--dangerously-skip-permissions');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('handleWakeFailure clears processed so task can retry', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const config = initConfig(home, 'hermes');
    const plan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T3',
      body: { markdown: 'z' },
    });
    const processed = new Set([plan.id]);
    saveProcessed(home, processed);
    claimTask(config, 'hermes', plan.id);
    handleWakeFailure(home, config, 'hermes', plan.id, 'spawn error');
    assert.equal(loadProcessed(home).has(plan.id), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('handleWakeFailure increments retries and recovers', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    const config = initConfig(home, 'hermes');
    setNode(home, 'hermes', { provider: 'hermes-cli', binary: 'hermes' });
    const plan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/p',
      title: 'T2',
      body: { markdown: 'y' },
    });
    claimTask(config, 'hermes', plan.id);
    handleWakeFailure(home, config, 'hermes', plan.id, 'ENOENT');
    const retries = loadRetries(home);
    assert.equal(retries[plan.id], 1);
    const pending = receiveTasks(config, 'hermes', 'pending');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, plan.id);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('buildSpawnForTask returns null for manual', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-relayd-'));
  try {
    assert.equal(
      buildSpawnForTask(home, { to: 'codex', id: '1', from: 'cursor', projectPath: '/x' }),
      null,
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
