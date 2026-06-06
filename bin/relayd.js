#!/usr/bin/env node
import { acquireLock, releaseLock, tick } from '../src/relayd.mjs';
import { resolveHome } from '../src/paths.mjs';

const home = resolveHome(process.env.AGENT_RELAY_HOME);
const intervalMs = Number(process.env.AGENT_RELAY_POLL_MS || 2000);

if (!acquireLock(home)) {
  console.error(JSON.stringify({ ok: false, error: 'relayd already running' }));
  process.exit(1);
}

process.on('SIGINT', () => {
  releaseLock(home);
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseLock(home);
  process.exit(0);
});

console.error(JSON.stringify({ ok: true, op: 'relayd_start', home, intervalMs }));

const loop = () => {
  try {
    const results = tick(home);
    if (results.length) {
      console.error(JSON.stringify({ ok: true, op: 'relayd_tick', results }));
    }
  } catch (err) {
    console.error(JSON.stringify({ ok: false, op: 'relayd_tick', error: err.message }));
  }
};

loop();
setInterval(loop, intervalMs);
