import { appendFileSync } from 'node:fs';
import { layout } from './paths.mjs';

/**
 * Append a JSON-line entry to relay.log.
 * Single shared writer — replaces the former appendLog (store) + relayLog (relayd).
 */
export function appendLog(home, entry) {
  const logPath = layout(home).log;
  appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', {
    flag: 'a',
    mode: 0o600,
  });
}
