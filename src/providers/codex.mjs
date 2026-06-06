export function buildCodexSpawn(task) {
  const summary = `Task ${task.id} from ${task.from}. Project: ${task.projectPath}.`;
  const tail = `When done, run: relay send ${task.from} --type result --task-id ${task.id} --project ${task.projectPath} --title Done --body '{"summary":"..."}'`;
  const prompt = `${summary}\n\n${task.body?.markdown || ''}\n\n${tail}`;
  return {
    cmd: 'codex',
    args: ['exec', prompt, '--cwd', task.projectPath],
  };
}
