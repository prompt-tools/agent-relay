import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { runSetupTui } from '../scripts/setup-tui.mjs';

const DETECTED = [
  { key: 'cursor', nodeId: 'cursor', binary: 'agent', provider: 'cursor-agent' },
  { key: 'hermes', nodeId: 'hermes', binary: 'hermes', provider: 'hermes-cli' },
];

function noopOutput() {
  return new Writable({ write(_chunk, _enc, cb) { cb(); } });
}

function promptQueue(answers) {
  const queue = [...answers];
  return async () => {
    const next = queue.shift();
    return next ?? '';
  };
}

test('runSetupTui non-TTY returns defaults without prompting', async () => {
  const result = await runSetupTui({
    role: 'sender',
    nodeId: 'hermes',
    detected: DETECTED,
    isTTY: false,
  });
  assert.deepEqual(result, { role: 'sender', nodeId: 'hermes', confirmed: true });
});

test('runSetupTui TTY flow with detected CLIs', async () => {
  const result = await runSetupTui({
    role: 'both',
    nodeId: 'cursor',
    detected: DETECTED,
    output: noopOutput(),
    isTTY: true,
    promptFn: promptQueue(['2', '2', 'y']),
  });
  assert.equal(result.role, 'receiver');
  assert.equal(result.nodeId, 'hermes');
  assert.equal(result.confirmed, true);
});

test('runSetupTui TTY manual node entry', async () => {
  const result = await runSetupTui({
    role: 'both',
    nodeId: 'cursor',
    detected: DETECTED,
    output: noopOutput(),
    isTTY: true,
    promptFn: promptQueue(['1', '3', 'my-node', 'y']),
  });
  assert.equal(result.role, 'sender');
  assert.equal(result.nodeId, 'my-node');
  assert.equal(result.confirmed, true);
});

test('runSetupTui TTY cancel on confirm n', async () => {
  const result = await runSetupTui({
    role: 'both',
    nodeId: 'cursor',
    detected: DETECTED,
    output: noopOutput(),
    isTTY: true,
    promptFn: promptQueue(['3', '1', 'n']),
  });
  assert.equal(result.confirmed, false);
});
