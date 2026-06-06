import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCursorSpawn } from '../src/providers/cursor.mjs';

const CTX = { home: '/tmp/r', relayBin: '/app/bin/relay.js', binary: '/usr/bin/agent' };

test('buildCursorSpawn uses agent --workspace --print', () => {
  const spec = buildCursorSpawn(
    { id: 't1', from: 'hermes', projectPath: '/proj', body: { markdown: 'do' } },
    CTX,
  );
  assert.equal(spec.cmd, '/usr/bin/agent');
  assert.ok(spec.args.includes('--workspace'));
  assert.ok(spec.args.includes('--print'));
  assert.ok(spec.args.includes('--approve-mcps'));
  assert.ok(spec.args.at(-1).includes("send 'hermes'"));
});
