import { relaySendInstruction } from './util.mjs';

export function buildHermesSpawn(task, ctx) {
  const header = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const prompt = [header, '', task.body?.markdown || '', '', relaySendInstruction(task, ctx)].join('\n');
  return {
    cmd: 'hermes',
    args: ['chat', '-q', prompt, '-Q', '--accept-hooks', '--yolo'],
    env: { AGENT_RELAY_HOME: ctx.home },
  };
}
