import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ensureLayout } from './paths.mjs';

const DEFAULT_NODES = ['cursor', 'codex', 'hermes', 'antigravity'];

/**
 * Load relay config, creating default if none exists.
 * @param {string} [home] - Override AGENT_RELAY_HOME
 * @returns {{nodeId: string, home: string, nodes: string[]}} Relay config
 */
export function loadConfig(home) {
  const paths = ensureLayout(home);
  if (!existsSync(paths.config)) {
    return { nodeId: 'cursor', home: paths.home, nodes: DEFAULT_NODES };
  }
  const raw = JSON.parse(readFileSync(paths.config, 'utf8'));
  return {
    nodeId: raw.nodeId || 'cursor',
    home: paths.home,
    nodes: raw.nodes || DEFAULT_NODES,
  };
}

/**
 * Initialize relay config directory and write config.json if absent.
 * @param {string} [home] - Override AGENT_RELAY_HOME
 * @param {string} [nodeId='cursor'] - Node id for this machine
 * @returns {object} Loaded config
 */
export function initConfig(home, nodeId = 'cursor') {
  const paths = ensureLayout(home);
  if (!existsSync(paths.config)) {
    writeFileSync(
      paths.config,
      JSON.stringify({ nodeId, nodes: DEFAULT_NODES }, null, 2) + '\n',
      { mode: 0o600 },
    );
  }
  return loadConfig(home);
}

/**
 * Validate that a node id is in the config's known nodes list.
 * @param {object} config - Relay config
 * @param {string} name - Node id to validate
 * @throws {Error} If node unknown
 */
export function assertNode(config, name) {
  if (!config.nodes.includes(name)) {
    throw new Error(`Unknown node "${name}". Known: ${config.nodes.join(', ')}`);
  }
}
