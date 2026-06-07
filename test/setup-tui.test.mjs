import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import {
  parseRoleChoice,
  parseNodeFromMenu,
  parseConfirm,
  runSetupTui,
} from '../scripts/setup-tui.mjs';
import { promptInteractive } from '../scripts/setup.mjs';

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

test('parseRoleChoice maps numbers and falls back', () => {
  assert.equal(parseRoleChoice('1'), 'sender');
  assert.equal(parseRoleChoice('2'), 'receiver');
  assert.equal(parseRoleChoice('3'), 'both');
  assert.equal(parseRoleChoice('', 'sender'), 'sender');
  assert.equal(parseRoleChoice('9', 'both'), 'both');
});

test('parseNodeFromMenu selects detected CLI or manual sentinel', () => {
  assert.equal(parseNodeFromMenu('2', DETECTED, 'cursor'), 'hermes');
  assert.equal(parseNodeFromMenu('', DETECTED, 'cursor'), 'cursor');
  assert.equal(parseNodeFromMenu('', DETECTED, 'unknown'), 'cursor');
  assert.equal(parseNodeFromMenu('3', DETECTED, 'cursor'), null);
  assert.equal(parseNodeFromMenu('custom', [], 'cursor'), 'custom');
  assert.equal(parseNodeFromMenu('', [], 'cursor'), 'cursor');
});

test('parseConfirm accepts y/yes only', () => {
  assert.equal(parseConfirm('y'), true);
  assert.equal(parseConfirm('Y'), true);
  assert.equal(parseConfirm('yes'), true);
  assert.equal(parseConfirm('n'), false);
  assert.equal(parseConfirm(''), false);
});

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

test('promptInteractive non-TTY skips TUI', async () => {
  const result = await promptInteractive({
    role: 'receiver',
    nodeId: 'hermes',
    detected: DETECTED,
  });
  assert.deepEqual(result, { role: 'receiver', nodeId: 'hermes' });
});
