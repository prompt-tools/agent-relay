import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function projectConfigPath(projectPath) {
  return join(projectPath, '.agent-relay', 'project.yaml');
}

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

export function resolveSendTarget({ to, projectPath }) {
  if (to) return to;
  if (!projectPath) return null;
  const routing = loadProjectRouting(projectPath);
  return routing?.defaultTo || null;
}
