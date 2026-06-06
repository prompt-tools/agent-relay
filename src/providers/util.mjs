export function relaySendInstruction(task, { home, relayBin }) {
  return [
    `When done, run this exact command to report back:`,
    `AGENT_RELAY_HOME=${home} node ${relayBin} send ${task.from} --type result --task-id ${task.id} --project ${task.projectPath} --title Done --body '{"summary":"YOUR_SUMMARY"}'`,
  ].join('\n');
}
