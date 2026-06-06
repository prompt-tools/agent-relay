import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { layout } from './paths.mjs';

export function loadNodes(home) {
  const p = layout(home).nodes;
  if (!existsSync(p)) return { nodes: {} };
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function saveNodes(home, data) {
  const p = layout(home).nodes;
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

export function getProvider(home, nodeId) {
  const { nodes } = loadNodes(home);
  return nodes[nodeId]?.provider || 'manual';
}

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
