import { relaySendInstruction } from './util.mjs';

export function buildAntigravitySpawn(task, ctx) {
  const header = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const prompt = [header, '', task.body?.markdown || '', '', relaySendInstruction(task, ctx)].join('\n');
  return {
    cmd: ctx.binary || 'agy',
    args: ['-p', prompt, '--dangerously-skip-permissions'],
    env: { AGENT_RELAY_HOME: ctx.home },
  };
}
