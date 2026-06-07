#!/usr/bin/env node
import readline from 'node:readline';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { sendTask, receiveTasks, claimTask } from '../src/store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
const SERVER_INFO = { name: 'agent-relay', version };

const TOOLS = [
  {
    name: 'relay_send',
    description: 'Send a task to another node pending queue',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Target node id' },
        from: { type: 'string', description: 'Sender node id (defaults to local nodeId)' },
        projectPath: { type: 'string', description: 'Absolute project path' },
        type: { type: 'string', enum: ['plan', 'result', 'failed', 'progress'], default: 'plan' },
        title: { type: 'string' },
        markdown: { type: 'string', description: 'Plan body markdown (type=plan)' },
        body: { type: 'object', description: 'Task body object' },
        taskId: { type: 'string', description: 'Original task id for result/failed' },
      },
      required: ['to', 'projectPath'],
    },
  },
  {
    name: 'relay_receive',
    description: 'List pending tasks for a node; optionally claim the newest matching task',
    inputSchema: {
      type: 'object',
      properties: {
        node: { type: 'string', description: 'Node to receive for (defaults to local nodeId)' },
        type: { type: 'string', enum: ['plan', 'result', 'failed', 'progress'] },
        claim: { type: 'boolean', description: 'If true, claim the newest pending task' },
        taskId: { type: 'string', description: 'Claim a specific task id' },
      },
    },
  },
];

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

function handleToolCall(name, args) {
  const config = loadConfig(process.env.AGENT_RELAY_HOME);
  if (name === 'relay_send') {
    const from = args.from || config.nodeId;
    const type = args.type || 'plan';
    const body = args.body || {};
    if (args.markdown) body.markdown = args.markdown;
    const task = sendTask(config, {
      type,
      to: args.to,
      from,
      projectPath: args.projectPath,
      title: args.title || 'Task',
      body,
      taskId: args.taskId,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ ok: true, task }, null, 2) }] };
  }
  if (name === 'relay_receive') {
    const node = args.node || config.nodeId;
    const tasks = receiveTasks(config, node, { type: args.type });
    let claimed = null;
    if (args.claim) {
      const id = args.taskId || tasks[0]?.id;
      if (id) claimed = claimTask(config, node, id);
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ok: true, tasks, claimed }, null, 2),
        },
      ],
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function handleMessage(msg) {
  const { id, method, params } = msg;
  try {
    if (method === 'initialize') {
      sendResponse(id, {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
      return;
    }
    if (method === 'notifications/initialized') return;
    if (method === 'tools/list') {
      sendResponse(id, { tools: TOOLS });
      return;
    }
    if (method === 'tools/call') {
      const result = handleToolCall(params.name, params.arguments || {});
      sendResponse(id, result);
      return;
    }
    if (method === 'ping') {
      sendResponse(id, {});
      return;
    }
    sendError(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    sendError(id, -32000, err.message);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handleMessage(JSON.parse(trimmed));
  } catch (err) {
    process.stderr.write(JSON.stringify({ parseError: err.message, line: trimmed }) + '\n');
  }
});
