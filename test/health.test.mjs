import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initConfig } from '../src/config.mjs';
import { healthReport, recentErrors, checkRelayd } from '../src/health.mjs';
import { layout } from '../src/paths.mjs';

test('healthReport returns structured checks', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-health-'));
  try {
    initConfig(home, 'hermes');
    const report = healthReport(home);
    assert.equal(typeof report.ok, 'boolean');
    assert.equal(report.checks.nodeId, 'hermes');
    assert.equal(report.checks.relayd.ok, false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('checkRelayd detects live pid', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-health-'));
  try {
    initConfig(home, 'hermes');
    writeFileSync(layout(home).relaydPid, String(process.pid), { mode: 0o600 });
    const r = checkRelayd(home);
    assert.equal(r.ok, true);
    assert.equal(r.pid, process.pid);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('checkRelayd detects stale pid', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-health-'));
  try {
    initConfig(home, 'hermes');
    writeFileSync(layout(home).relaydPid, '99999999', { mode: 0o600 });
    const r = checkRelayd(home);
    assert.equal(r.ok, false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('recentErrors parses generic error field', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-health-'));
  try {
    initConfig(home, 'hermes');
    const log = layout(home).log;
    writeFileSync(log, JSON.stringify({ op: 'send', error: 'disk full' }) + '\n', { mode: 0o600 });
    const errs = recentErrors(home);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].error, 'disk full');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('recentErrors parses relayd_error lines', () => {
  const home = mkdtempSync(join(tmpdir(), 'agent-relay-health-'));
  try {
    initConfig(home, 'hermes');
    const log = layout(home).log;
    writeFileSync(
      log,
      JSON.stringify({ op: 'relayd_error', id: 't1', error: 'boom' }) + '\n',
      { mode: 0o600 },
    );
    const errs = recentErrors(home);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].error, 'boom');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
