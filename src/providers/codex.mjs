import { relaySendInstruction } from './util.mjs';

export function buildCodexSpawn(task, ctx) {
  const header = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const prompt = [header, '', task.body?.markdown || '', '', relaySendInstruction(task, ctx)].join('\n');
  return {
    cmd: ctx.binary || 'codex',
    args: ['exec', prompt, '--cwd', task.projectPath],
    env: { AGENT_RELAY_HOME: ctx.home },
  };
}
