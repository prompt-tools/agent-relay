import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  mergeMcpConfig,
  buildLaunchdPlist,
  writeLaunchdPlist,
  configureNodes,
  runSetup,
} from '../scripts/setup.mjs';
import { loadNodes } from '../src/nodes.mjs';

test('mergeMcpConfig adds agent-relay entry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    const cfg = join(dir, 'mcp.json');
    const out = mergeMcpConfig(cfg, '/fake/mcp/server.mjs');
    assert.equal(out, cfg);
    const parsed = JSON.parse(readFileSync(cfg, 'utf8'));
    assert.ok(parsed.mcpServers['agent-relay']);
    assert.equal(parsed.mcpServers['agent-relay'].args[0], '/fake/mcp/server.mjs');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mergeMcpConfig preserves existing servers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    const cfg = join(dir, 'mcp.json');
    mergeMcpConfig(cfg, '/relay/mcp/server.mjs');
    mergeMcpConfig(cfg, '/relay/mcp/server.mjs');
    const parsed = JSON.parse(readFileSync(cfg, 'utf8'));
    assert.ok(parsed.mcpServers['agent-relay']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildLaunchdPlist contains relayd path', () => {
  const xml = buildLaunchdPlist({ home: '/tmp/relay', relaydPath: '/app/bin/relayd.js' });
  assert.ok(xml.includes('com.agent-relay.relayd'));
  assert.ok(xml.includes('/app/bin/relayd.js'));
  assert.ok(xml.includes('/tmp/relay'));
});

test('writeLaunchdPlist creates plist file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    const la = join(dir, 'LaunchAgents');
    const path = writeLaunchdPlist('/tmp/r', '/bin/relayd.js', { launchAgentsDir: la });
    assert.ok(existsSync(path));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('configureNodes receiver picks detected provider', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    configureNodes(home, {
      role: 'receiver',
      nodeId: 'codex',
      detected: [{ nodeId: 'codex', provider: 'codex-exec', binary: 'codex' }],
    });
    const nodes = loadNodes(home);
    assert.equal(nodes.nodes.codex.provider, 'codex-exec');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('runSetup dry-run does not write nodes', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-setup-'));
  try {
    const result = await runSetup({ home, role: 'both', nodeId: 'cursor', dryRun: true, nonInteractive: true });
    assert.equal(result.ok, true);
    assert.equal(result.steps[0].step, 'dry-run');
    assert.equal(existsSync(join(home, 'nodes.yaml')), false);
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
    assert.ok(existsSync(join(home, 'nodes.yaml')));
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
