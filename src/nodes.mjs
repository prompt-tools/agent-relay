import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { layout } from './paths.mjs';

export function loadNodes(home) {
  const paths = layout(home);
  const yamlPath = paths.nodes.replace('.json', '.yaml');
  // 迁移: .yaml → .json
  if (!existsSync(paths.nodes) && existsSync(yamlPath)) {
    renameSync(yamlPath, paths.nodes);
  }
  if (!existsSync(paths.nodes)) return { nodes: {} };
  return JSON.parse(readFileSync(paths.nodes, 'utf8'));
}

export function saveNodes(home, data) {
  const p = layout(home).nodes;
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

/**
 * Retrieve the provider handler name for a node.
 * @param {string} home - Relay home path
 * @param {string} nodeId - Node id
 * @returns {string} Provider name (e.g. 'hermes-cli', 'codex-exec') or 'manual'
 */
export function getProvider(home, nodeId) {
  const { nodes } = loadNodes(home);
  return nodes[nodeId]?.provider || 'manual';
}

/**
 * Return the spec/definition for a given node id.
 * @param {string} home - Relay home path
 * @param {string} nodeId - Node id
 * @returns {{provider: string, binary?: string}} Node spec
 */
export function getNodeSpec(home, nodeId) {
  const { nodes } = loadNodes(home);
  return nodes[nodeId] || { provider: 'manual' };
}

export function setNode(home, nodeId, { provider, binary }) {
  const data = loadNodes(home);
  data.nodes = data.nodes || {};
  data.nodes[nodeId] = { provider, ...(binary ? { binary } : {}) };
  saveNodes(home, data);
  return data.nodes[nodeId];
}
