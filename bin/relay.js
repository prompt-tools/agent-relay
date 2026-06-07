#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { initConfig, loadConfig } from '../src/config.mjs';
import { resolveSendTarget } from '../src/project.mjs';
import { healthReport } from '../src/health.mjs';
import { recoverTask, recoverAllStuck, listStuckActive } from '../src/recover.mjs';
import {
  sendTask,
  listTasks,
  claimTask,
  receiveTasks,
  status,
  showTask,
} from '../src/store.mjs';

const args = process.argv.slice(2);
const cmd = args[0];

function usage() {
  console.log(`agent-relay — cross-IDE task relay

Usage:
  relay init [--as <nodeId>]       Initialize ~/.agent-relay
  relay send <to> --from <node> --project <path> [--type plan|result|failed|progress]
                 --title <t> [--body <json>|--plan <file>|--plan-text <md>]
                 [--task-id <id>]
  relay receive <node> [--type plan|result|failed|progress]
  relay list <node> [--status pending|active|done|failed]
  relay claim <node> [taskId]
  relay show <taskId>
  relay status [--health]
  relay health
  relay watch [--interval <sec>] [--once] [--json]
  relay recover <node> [--task-id <id>] [--older-than <sec>]
  relay setup [--role sender|receiver|both] [--node <nodeId>] [--dry-run] [--skip-auth]

Deprecated (use send/receive instead):
  relay pull, relay complete, relay fail

Env: AGENT_RELAY_HOME (default ~/.agent-relay)
`);
}

function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function deprecated(name) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: `relay ${name} is deprecated; use relay send/receive. See docs/PRINCIPLES.md`,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}

async function run() {
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

  if (cmd === 'setup') {
    const { runSetup } = await import('../scripts/setup.mjs');
    const result = await runSetup({
      home,
      role: flag('--role'),
      nodeId: flag('--node'),
      dryRun: args.includes('--dry-run'),
      mergeMcp: !args.includes('--no-mcp'),
      installLaunchd: !args.includes('--no-launchd'),
      skipAuth: args.includes('--skip-auth'),
      nonInteractive: args.includes('--yes'),
      loadLaunchd: !args.includes('--no-launchd-load'),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === 'pull' || cmd === 'complete' || cmd === 'fail') {
    deprecated(cmd);
    return;
  }

  const config = loadConfig(home);

  if (cmd === 'send') {
    const projectPath = flag('--project');
    let to = args[1];
    if (!to || to.startsWith('--')) {
      to = resolveSendTarget({ projectPath });
      if (!to) throw new Error('<to> or --project with .agent-relay/project.yaml defaultTo required');
    }
    const from = flag('--from') || config.nodeId;
    const title = flag('--title') || 'Task';
    const type = flag('--type') || 'plan';
    const taskId = flag('--task-id');
    const bodyJson = flag('--body');
    const planFile = flag('--plan');
    const planText = flag('--plan-text');
    if (!projectPath) throw new Error('--project <path> required');
    let body = bodyJson ? JSON.parse(bodyJson) : {};
    let planMarkdown;
    if (planFile) planMarkdown = readFileSync(planFile, 'utf8');
    if (planText) planMarkdown = planText;
    if (planMarkdown !== undefined) body = { ...body, markdown: planMarkdown };
    if (type === 'plan' && !body.markdown) {
      throw new Error('--plan <file>, --plan-text, or --body with markdown required for type=plan');
    }
    const task = sendTask(config, {
      type,
      to,
      from,
      projectPath,
      title,
      body,
      taskId,
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          id: task.id,
          path: `${config.home}/tasks/pending/${to}/${task.id}.json`,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (cmd === 'receive') {
    const node = args[1] || config.nodeId;
    const type = flag('--type');
    console.log(JSON.stringify(receiveTasks(config, node, { type }), null, 2));
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

  if (cmd === 'show') {
    console.log(JSON.stringify(showTask(config, args[1]), null, 2));
    return;
  }

  if (cmd === 'recover') {
    const node = args[1] || config.nodeId;
    const taskId = flag('--task-id');
    const olderThanSec = Number(flag('--older-than') || 0);
    if (taskId) {
      console.log(JSON.stringify({ ok: true, task: recoverTask(config, node, taskId) }, null, 2));
      return;
    }
    const olderThanMs = olderThanSec * 1000;
    const recovered = recoverAllStuck(config, node, { olderThanMs });
    const stuck = listStuckActive(config, node, { olderThanMs });
    console.log(JSON.stringify({ ok: true, recovered, remaining: stuck.length }, null, 2));
    return;
  }

  if (cmd === 'health') {
    console.log(JSON.stringify(healthReport(config.home), null, 2));
    return;
  }

  if (cmd === 'status') {
    if (args.includes('--health')) {
      console.log(JSON.stringify({ ...status(config), health: healthReport(config.home) }, null, 2));
      return;
    }
    console.log(JSON.stringify(status(config), null, 2));
    return;
  }

  if (cmd === 'watch') {
    const { runWatch } = await import('../src/watch.mjs');
    const intervalRaw = flag('--interval');
    const intervalSec = intervalRaw == null ? 5 : Number(intervalRaw);
    if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
      throw new Error('--interval must be a positive number of seconds');
    }
    const timer = runWatch(config, {
      intervalSec,
      once: args.includes('--once'),
      json: args.includes('--json'),
    });
    if (timer) {
      const shutdown = () => {
        clearInterval(timer);
        process.exit(0);
      };
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    }
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
