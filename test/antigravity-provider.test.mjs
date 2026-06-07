import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAntigravitySpawn } from '../src/providers/antigravity.mjs';

const CTX = { home: '/tmp/relay-home', relayBin: '/app/bin/relay.js' };

test('buildAntigravitySpawn uses agy -p with skip-permissions', () => {
  const spec = buildAntigravitySpawn(
    { id: 't1', from: 'cursor', projectPath: '/tmp/p', body: { markdown: 'do work' } },
    CTX,
  );
  assert.equal(spec.cmd, 'agy');
  assert.equal(spec.args[0], '-p');
  assert.ok(spec.args[1].includes('do work'));
  assert.ok(spec.args[1].includes("send 'cursor'"));
  assert.ok(spec.args[1].includes("--task-id 't1'"));
  assert.equal(spec.args[2], '--dangerously-skip-permissions');
  assert.deepEqual(spec.env, { AGENT_RELAY_HOME: '/tmp/relay-home' });
});

test('buildAntigravitySpawn respects ctx.binary override', () => {
  const spec = buildAntigravitySpawn(
    { id: 't2', from: 'hermes', projectPath: '/proj', body: { markdown: 'ping' } },
    { ...CTX, binary: '/opt/agy' },
  );
  assert.equal(spec.cmd, '/opt/agy');
});

test('buildAntigravitySpawn handles missing body', () => {
  const spec = buildAntigravitySpawn(
    { id: 't3', from: 'cursor', projectPath: '/tmp/p' },
    CTX,
  );
  assert.equal(spec.cmd, 'agy');
  assert.equal(spec.args[0], '-p');
  assert.ok(spec.args[1].includes("send 'cursor'"));
  assert.ok(spec.args[1].includes("--task-id 't3'"));
  assert.equal(spec.args[2], '--dangerously-skip-permissions');
});
