import { relaySendInstruction } from './util.mjs';

const PROVIDER_SPECS = {
  'codex-exec':      { binary: 'codex', args: (prompt, cwd) => ['exec', prompt, '--cwd', cwd] },
  'hermes-cli':      { binary: 'hermes', args: (prompt) => ['chat', '-q', prompt, '-Q', '--accept-hooks', '--yolo'] },
  'cursor-agent':    { binary: 'agent', args: (prompt, cwd) => ['--workspace', cwd, '--print', '--output-format', 'text', '--force', '--approve-mcps', prompt] },
  'antigravity-cli': { binary: 'agy', args: (prompt) => ['-p', prompt, '--dangerously-skip-permissions'] },
};

export function buildSpawn(providerKey, task, ctx) {
  const spec = PROVIDER_SPECS[providerKey];
  if (!spec) return null;
  const header = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const prompt = [header, '', task.body?.markdown || '', '', relaySendInstruction(task, ctx)].join('\n');
  return { cmd: ctx.binary || spec.binary, args: spec.args(prompt, task.projectPath), env: { AGENT_RELAY_HOME: ctx.home } };
}

export { PROVIDER_SPECS };
