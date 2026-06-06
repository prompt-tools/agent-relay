import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadNodes, saveNodes, getProvider, setNode } from '../src/nodes.mjs';

test('nodes.yaml roundtrip', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-nodes-'));
  try {
    assert.equal(getProvider(home, 'codex'), 'manual');
    setNode(home, 'codex', { provider: 'codex-exec', binary: 'codex' });
    const loaded = loadNodes(home);
    assert.equal(loaded.nodes.codex.provider, 'codex-exec');
    saveNodes(home, loaded);
    assert.equal(getProvider(home, 'codex'), 'codex-exec');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
