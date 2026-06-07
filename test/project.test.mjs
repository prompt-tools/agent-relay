import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadProjectRouting, resolveSendTarget } from '../src/project.mjs';

test('loadProjectRouting reads defaultTo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-relay-proj-'));
  try {
    const cfg = join(dir, '.agent-relay');
    mkdirSync(cfg, { recursive: true });
    writeFileSync(join(cfg, 'project.json'), JSON.stringify({ defaultTo: 'hermes' }) + '\n');
    const r = loadProjectRouting(dir);
    assert.equal(r.defaultTo, 'hermes');
    assert.equal(resolveSendTarget({ projectPath: dir }), 'hermes');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
