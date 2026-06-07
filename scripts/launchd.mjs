import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LABEL = 'com.agent-relay.relayd';

export function launchdPlistPath(dir) {
  return join(dir || join(homedir(), 'Library', 'LaunchAgents'), `${LABEL}.plist`);
}

export function loadLaunchd(plistPath) {
  if (process.platform !== 'darwin') {
    throw new Error('launchd is macOS-only. On Linux, run relayd manually or use systemd.');
  }
  const uid = process.getuid?.() ?? Number(execSync('id -u', { encoding: 'utf8' }).trim());
  const domain = `gui/${uid}`;
  try {
    execSync(`launchctl bootout ${domain} ${plistPath}`, { stdio: 'ignore' });
  } catch {
    /* not loaded */
  }
  execSync(`launchctl bootstrap ${domain} ${plistPath}`, { stdio: 'pipe' });
  return { ok: true, domain, plistPath };
}

export function unloadLaunchd(plistPath) {
  const uid = process.getuid?.() ?? Number(execSync('id -u', { encoding: 'utf8' }).trim());
  execSync(`launchctl bootout gui/${uid} ${plistPath}`, { stdio: 'pipe' });
  return { ok: true };
}
