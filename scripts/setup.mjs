import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initConfig } from '../src/config.mjs';
import { setNode } from '../src/nodes.mjs';
import { resolveHome } from '../src/paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

export const CLI_CANDIDATES = {
  codex: { binary: 'codex', provider: 'codex-exec', nodeId: 'codex' },
  cursor: { binary: 'agent', provider: 'cursor-agent', nodeId: 'cursor' },
  hermes: { binary: 'hermes', provider: 'hermes-cli', nodeId: 'hermes' },
  antigravity: { binary: 'agy', provider: 'antigravity-cli', nodeId: 'antigravity' },
};

export function commandExists(binary) {
  try {
    execSync(`command -v ${binary}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectClis() {
  const found = [];
  for (const [key, spec] of Object.entries(CLI_CANDIDATES)) {
    if (commandExists(spec.binary)) {
      found.push({ key, ...spec });
    }
  }
  return found;
}

export function buildMcpEntry(relayMcpPath) {
  return {
    'agent-relay': {
      command: process.execPath,
      args: [relayMcpPath],
      env: {},
    },
  };
}

export function mergeMcpConfig(configPath, relayMcpPath) {
  const entry = buildMcpEntry(relayMcpPath);
  mkdirSync(dirname(configPath), { recursive: true });
  let config = { mcpServers: {} };
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.mcpServers = config.mcpServers || {};
  }
  config.mcpServers = { ...config.mcpServers, ...entry };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  return configPath;
}

export function buildLaunchdPlist({ home, relaydPath, nodeEnv = {} }) {
  const envXml = Object.entries({
    AGENT_RELAY_HOME: home,
    ...nodeEnv,
  })
    .map(([k, v]) => `    <key>${k}</key>\n    <string>${v}</string>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.agent-relay.relayd</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${relaydPath}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${envXml}
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(home, 'relayd.stdout.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(home, 'relayd.stderr.log')}</string>
</dict>
</plist>
`;
}

export function writeLaunchdPlist(home, relaydPath, { launchAgentsDir } = {}) {
  const dir = launchAgentsDir || join(homedir(), 'Library', 'LaunchAgents');
  mkdirSync(dir, { recursive: true });
  const plistPath = join(dir, 'com.agent-relay.relayd.plist');
  writeFileSync(plistPath, buildLaunchdPlist({ home, relaydPath }), { mode: 0o644 });
  return plistPath;
}

export function configureNodes(home, { role, nodeId, detected }) {
  const results = [];
  if (role === 'sender' || role === 'both') {
    setNode(home, nodeId, { provider: 'manual' });
    results.push({ nodeId, provider: 'manual', role: 'sender' });
  }
  if (role === 'receiver' || role === 'both') {
    const self = detected.find((d) => d.nodeId === nodeId);
    const provider = self?.provider || 'manual';
    const binary = self?.binary;
    setNode(home, nodeId, { provider, ...(binary ? { binary } : {}) });
    results.push({ nodeId, provider, binary, role: 'receiver' });
  }
  return results;
}

export function runSetup(options = {}) {
  const {
    home = resolveHome(process.env.AGENT_RELAY_HOME),
    role = options.role || 'both',
    nodeId = options.nodeId || 'cursor',
    mergeMcp = role !== 'receiver',
    installLaunchd = role !== 'sender',
    mcpConfigPath = join(homedir(), '.cursor', 'mcp.json'),
    relayMcpPath = join(REPO_ROOT, 'mcp', 'server.mjs'),
    relaydPath = join(REPO_ROOT, 'bin', 'relayd.js'),
    launchAgentsDir,
    dryRun = false,
  } = options;

  if (!['sender', 'receiver', 'both'].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const detected = detectClis();
  const steps = [];

  if (!dryRun) {
    initConfig(home, nodeId);
    const nodes = configureNodes(home, { role, nodeId, detected });
    steps.push({ step: 'nodes', nodes });

    if (mergeMcp) {
      const mcpPath = mergeMcpConfig(mcpConfigPath, relayMcpPath);
      steps.push({ step: 'mcp', path: mcpPath });
    }

    if (installLaunchd) {
      const plist = writeLaunchdPlist(home, relaydPath, { launchAgentsDir });
      steps.push({ step: 'launchd', path: plist });
    }
  } else {
    steps.push({ step: 'dry-run', role, nodeId, detected: detected.map((d) => d.key) });
  }

  return {
    ok: true,
    home,
    role,
    nodeId,
    detected,
    steps,
  };
}
