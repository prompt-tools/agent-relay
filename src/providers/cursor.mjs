import { relaySendInstruction } from './util.mjs';

export function buildCursorSpawn(task, ctx) {
  const header = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const prompt = [header, '', task.body?.markdown || '', '', relaySendInstruction(task, ctx)].join('\n');
  const args = [
    '--workspace',
    task.projectPath,
    '--print',
    '--output-format',
    'text',
    '--force',
    '--approve-mcps',
    prompt,
  ];
  return {
    cmd: ctx.binary || 'agent',
    args,
    env: { AGENT_RELAY_HOME: ctx.home },
  };
}
