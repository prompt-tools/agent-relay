import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask } from '../src/store.mjs';
import { setNode } from '../src/nodes.mjs';
import { buildSpawnForTask, loadProcessed, saveProcessed, tick } from '../src/relayd.mjs';
import { buildCodexSpawn } from '../src/providers/codex.mjs';
import { buildHermesSpawn } from '../src/providers/hermes.mjs';

const CTX = { home: '/tmp/relay-home', relayBin: '/app/bin/relay.js' };

test('buildCodexSpawn includes relay send tail', () => {
  const spec = buildCodexSpawn(
    { id: 't1', from: 'cursor', projectPath: '/tmp/p', body: { markdown: 'do work' } },
    CTX,
  );
  assert.equal(spec.cmd, 'codex');
  assert.ok(spec.args.join(' ').includes('send cursor'));
  assert.ok(spec.args.join(' ').includes('--task-id t1'));
});

test('buildHermesSpawn uses hermes chat -q', () => {
  const spec = buildHermesSpawn(
    { id: 't2', from: 'cursor', projectPath: '/tmp/p', body: { markdown: 'ping' } },
    CTX,
  );
  assert.equal(spec.cmd, 'hermes');
  assert.equal(spec.args[0], 'chat');
  assert.equal(spec.args[1], '-q');
  assert.ok(spec.args[2].includes('send cursor'));
  assert.ok(spec.args[2].includes('--task-id t2'));
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
