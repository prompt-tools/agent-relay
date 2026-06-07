import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Return the path to a project's agent-relay config file.
 * @param {string} projectPath - Absolute path to the project root
 * @returns {string} Path to .agent-relay/project.yaml
 */
export function projectConfigPath(projectPath) {
  return join(projectPath, '.agent-relay', 'project.yaml');
}

/**
 * Load project-level routing config (defaultTo/defaultFrom).
 * @param {string} projectPath - Absolute path to the project root
 * @returns {{defaultTo: string|null, defaultFrom: string|null}|null} Routing config or null
 */
export function loadProjectRouting(projectPath) {
  const p = projectConfigPath(projectPath);
  if (!existsSync(p)) return null;
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return {
    defaultTo: raw.defaultTo || null,
    defaultFrom: raw.defaultFrom || null,
    ...raw,
  };
}

/**
 * Resolve the target node for a send operation, using explicit arg or project routing.
 * @param {{to?: string, projectPath?: string}} opts - Send options
 * @returns {string|null} Target node id or null
 */
export function resolveSendTarget({ to, projectPath }) {
  if (to) return to;
  if (!projectPath) return null;
  const routing = loadProjectRouting(projectPath);
  return routing?.defaultTo || null;
}
