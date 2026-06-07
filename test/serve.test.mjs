import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { sendTask, claimTask } from '../src/store.mjs';
import { createServeHandler, startServe } from '../src/serve.mjs';

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function startOnEphemeral(config) {
  const server = startServe(config, { host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  return server;
}

test('GET /api/watch returns watch snapshot JSON', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-serve-'));
  const config = initConfig(home, 'cursor');
  const server = await startOnEphemeral(config);
  try {
    const { port } = server.address();
    const plan = sendTask(config, {
      type: 'plan',
      to: 'hermes',
      from: 'cursor',
      projectPath: '/tmp/proj',
      title: 'Serve test',
      body: { markdown: '## work' },
    });
    claimTask(config, 'hermes', plan.id);

    const res = await fetch(`http://127.0.0.1:${port}/api/watch`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.equal(body.nodeId, 'cursor');
    assert.equal(typeof body.counts, 'object');
    assert.equal(body.active.length, 1);
    assert.equal(body.active[0].id, plan.id);
  } finally {
    await closeServer(server);
    rmSync(home, { recursive: true, force: true });
  }
});

test('GET /api/health returns health report JSON', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-serve-'));
  const config = initConfig(home, 'hermes');
  const server = await startOnEphemeral(config);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.ok, 'boolean');
    assert.equal(body.checks.nodeId, 'hermes');
    assert.equal(body.checks.relayd.ok, false);
  } finally {
    await closeServer(server);
    rmSync(home, { recursive: true, force: true });
  }
});

test('GET / serves HTML dashboard with polling script', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-serve-'));
  const config = initConfig(home, 'cursor');
  const server = await startOnEphemeral(config);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const html = await res.text();
    assert.match(html, /agent-relay watch/);
    assert.match(html, /fetch\('\/api\/watch'\)/);
    assert.match(html, /setInterval\(refresh, 5000\)/);
  } finally {
    await closeServer(server);
    rmSync(home, { recursive: true, force: true });
  }
});

test('createServeHandler returns 404 for unknown routes', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-serve-'));
  const config = initConfig(home, 'cursor');
  const server = http.createServer(createServeHandler(config));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.ok, false);
  } finally {
    await closeServer(server);
    rmSync(home, { recursive: true, force: true });
  }
});
