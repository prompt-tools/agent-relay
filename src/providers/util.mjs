function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function relaySendInstruction(task, { home, relayBin }) {
  const cmd = [
    `AGENT_RELAY_HOME=${shellQuote(home)}`,
    `node ${shellQuote(relayBin)} send ${shellQuote(task.from)}`,
    `--type result --task-id ${shellQuote(task.id)}`,
    `--project ${shellQuote(task.projectPath)}`,
    `--title Done --body '{"summary":"YOUR_SUMMARY"}'`,
  ].join(' ');
  return [`When done, run this exact command to report back:`, cmd].join('\n');
}
