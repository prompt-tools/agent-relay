import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authPlan, runAuthSequence } from '../scripts/auth.mjs';
import { isCliReady } from '../src/detect.mjs';

test('authPlan receiver hermes includes hermes only', () => {
  const plan = authPlan({
    role: 'receiver',
    nodeId: 'hermes',
    detected: [{ key: 'hermes', nodeId: 'hermes' }],
  });
  assert.deepEqual(plan, ['hermes']);
});

test('authPlan sender includes cursor', () => {
  const plan = authPlan({
    role: 'sender',
    nodeId: 'cursor',
    detected: [{ key: 'cursor', nodeId: 'cursor' }],
  });
  assert.deepEqual(plan, ['cursor']);
});

test('runAuthSequence skipAuth', () => {
  const r = runAuthSequence({ role: 'both', nodeId: 'hermes', detected: [], skipAuth: true });
  assert.equal(r.steps[0].skipped, true);
});

test('isCliReady hermes when keys present', () => {
  const r = isCliReady('hermes');
  assert.equal(typeof r.ready, 'boolean');
});
