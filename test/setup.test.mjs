import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runSetup } from '../scripts/setup.mjs';
import { loadNodes } from '../src/nodes.mjs';

test('runSetup dry-run does not write nodes', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    const result = await runSetup({ home, role: 'both', nodeId: 'cursor', dryRun: true, nonInteractive: true });
    assert.equal(result.ok, true);
    assert.equal(result.steps[0].step, 'dry-run');
    assert.equal(existsSync(join(home, 'nodes.json')), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('runSetup receiver writes nodes and launchd', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  const la = mkdtempSync(join(tmpdir(), 'agent-relay-la-'));
  try {
    const result = await runSetup({
      home,
      role: 'receiver',
      nodeId: 'codex',
      mergeMcp: false,
      launchAgentsDir: la,
      nonInteractive: true,
      skipAuth: true,
      loadLaunchd: false,
    });
    assert.equal(result.ok, true);
    assert.ok(existsSync(join(home, 'config.json')));
    assert.ok(existsSync(join(home, 'nodes.json')));
    // launchd plist is only written on macOS
    if (process.platform === 'darwin') {
      assert.ok(existsSync(join(la, 'com.agent-relay.relayd.plist')));
    } else {
      assert.equal(existsSync(join(la, 'com.agent-relay.relayd.plist')), false);
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(la, { recursive: true, force: true });
  }
});
