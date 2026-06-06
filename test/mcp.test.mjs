import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'mcp', 'server.mjs');

function rpc(child, message) {
  return new Promise((resolve, reject) => {
    const onData = (buf) => {
      const lines = buf.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === message.id) {
            child.stdout.off('data', onData);
            resolve(parsed);
          }
        } catch {
          /* ignore partial */
        }
      }
    };
    child.stdout.on('data', onData);
    child.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(() => reject(new Error('rpc timeout')), 5000);
  });
}

test('mcp tools/list returns relay_send and relay_receive', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-mcp-'));
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, AGENT_RELAY_HOME: home },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  try {
    await rpc(child, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const res = await rpc(child, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const names = res.result.tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['relay_receive', 'relay_send']);
  } finally {
    child.kill();
    rmSync(home, { recursive: true, force: true });
  }
});

test('mcp relay_send creates pending task', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-mcp-'));
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, AGENT_RELAY_HOME: home },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  try {
    await rpc(child, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const res = await rpc(child, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'relay_send',
        arguments: {
          to: 'codex',
          from: 'cursor',
          projectPath: '/tmp/p',
          title: 'MCP test',
          markdown: 'hello',
        },
      },
    });
    const payload = JSON.parse(res.result.content[0].text);
    assert.equal(payload.ok, true);
    assert.equal(payload.task.to, 'codex');
    assert.equal(payload.task.type, 'plan');
  } finally {
    child.kill();
    rmSync(home, { recursive: true, force: true });
  }
});
