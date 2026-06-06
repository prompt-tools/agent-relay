import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ensureLayout } from './paths.mjs';

const DEFAULT_NODES = ['cursor', 'codex', 'hermes', 'antigravity'];

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

export function assertNode(config, name) {
  if (!config.nodes.includes(name)) {
    throw new Error(`Unknown node "${name}". Known: ${config.nodes.join(', ')}`);
  }
}
