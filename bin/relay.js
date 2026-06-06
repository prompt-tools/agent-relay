#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { initConfig, loadConfig } from '../src/config.mjs';
import {
  sendTask,
  listTasks,
  claimTask,
  completeTask,
  failTask,
  pullInbox,
  status,
  showTask,
} from '../src/store.mjs';

const args = process.argv.slice(2);
const cmd = args[0];

function usage() {
  console.log(`agent-relay — cross-IDE task relay

Usage:
  relay init [--as <nodeId>]     Initialize ~/.agent-relay
  relay send <to> --from <node> --title <t> [--plan <file>|--plan-text <md>]
  relay list <node> [--status pending|active|done|failed]
  relay claim <node> [taskId]
  relay complete <node> <taskId> --summary <text>
  relay fail <node> <taskId> --reason <text>
  relay pull <node>              Inbox results for node
  relay show <taskId>
  relay status

Env: AGENT_RELAY_HOME (default ~/.agent-relay)
`);
}

function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function run() {
  if (!cmd || cmd === '--help' || cmd === '-h') {
    usage();
    return;
  }

  const home = process.env.AGENT_RELAY_HOME;

  if (cmd === 'init') {
    const as = flag('--as') || 'cursor';
    const cfg = initConfig(home, as);
    console.log(JSON.stringify({ ok: true, home: cfg.home, nodeId: cfg.nodeId }, null, 2));
    return;
  }

  const config = loadConfig(home);

  if (cmd === 'send') {
    const to = args[1];
    const from = flag('--from') || config.nodeId;
    const title = flag('--title') || 'Task';
    const planFile = flag('--plan');
    const planText = flag('--plan-text');
    let markdown = planText || '';
    if (planFile) markdown = readFileSync(planFile, 'utf8');
    if (!markdown) throw new Error('--plan <file> or --plan-text required');
    const task = sendTask(config, {
      to,
      from,
      title,
      planMarkdown: markdown,
    });
    console.log(JSON.stringify({ ok: true, id: task.id, path: `${config.home}/tasks/pending/${to}/${task.id}.plan.json` }, null, 2));
    return;
  }

  if (cmd === 'list') {
    const node = args[1];
    const st = flag('--status') || 'pending';
    console.log(JSON.stringify(listTasks(config, node, st), null, 2));
    return;
  }

  if (cmd === 'claim') {
    const node = args[1];
    const id = args[2];
    console.log(JSON.stringify(claimTask(config, node, id), null, 2));
    return;
  }

  if (cmd === 'complete') {
    const node = args[1];
    const id = args[2];
    const summary = flag('--summary') || 'Done';
    console.log(JSON.stringify(completeTask(config, node, id, { summary }), null, 2));
    return;
  }

  if (cmd === 'fail') {
    const node = args[1];
    const id = args[2];
    const reason = flag('--reason') || 'Failed';
    console.log(JSON.stringify(failTask(config, node, id, reason), null, 2));
    return;
  }

  if (cmd === 'pull') {
    const node = args[1];
    console.log(JSON.stringify(pullInbox(config, node), null, 2));
    return;
  }

  if (cmd === 'show') {
    console.log(JSON.stringify(showTask(config, args[1]), null, 2));
    return;
  }

  if (cmd === 'status') {
    console.log(JSON.stringify(status(config), null, 2));
    return;
  }

  usage();
  process.exitCode = 1;
}

try {
  run();
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exitCode = 1;
}
