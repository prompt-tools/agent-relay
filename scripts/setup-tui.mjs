import readline from 'node:readline/promises';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';

const ROLE_BY_NUM = {
  1: 'sender',
  2: 'receiver',
  3: 'both',
};

const ROLE_NUM = {
  sender: 1,
  receiver: 2,
  both: 3,
};

export function parseRoleChoice(raw, fallback = 'both') {
  const v = (raw ?? '').trim();
  if (!v) return fallback;
  const n = Number(v);
  return ROLE_BY_NUM[n] ?? fallback;
}

export function parseNodeFromMenu(raw, detected, fallback) {
  const v = (raw ?? '').trim();
  if (!detected.length) {
    return v || fallback;
  }
  if (!v) {
    const idx = detected.findIndex((d) => d.nodeId === fallback);
    return idx >= 0 ? detected[idx].nodeId : detected[0].nodeId;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return fallback;
  if (n >= 1 && n <= detected.length) return detected[n - 1].nodeId;
  if (n === detected.length + 1) return null;
  return fallback;
}

export function parseConfirm(raw) {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'y' || v === 'yes';
}

function defaultNodeChoice(detected, nodeId) {
  const idx = detected.findIndex((d) => d.nodeId === nodeId);
  return idx >= 0 ? idx + 1 : 1;
}

export async function runSetupTui({
  role = 'both',
  nodeId = 'cursor',
  detected = [],
  input = defaultInput,
  output = defaultOutput,
  isTTY = input.isTTY ?? false,
  promptFn,
} = {}) {
  if (!isTTY) {
    return { role, nodeId, confirmed: true };
  }

  let rl;
  let ask;
  if (promptFn) {
    ask = promptFn;
  } else {
    rl = readline.createInterface({ input, output });
    ask = (text) => rl.question(text);
  }

  try {
    output.write('\nagent-relay setup\n\n');

    output.write('Role:\n');
    output.write('  1) sender\n');
    output.write('  2) receiver\n');
    output.write('  3) both\n');
    const roleDefault = ROLE_NUM[role] ?? 3;
    const roleRaw = await ask(`Choose [1-3] (default ${roleDefault}): `);
    role = parseRoleChoice(roleRaw, role);

    output.write('\nNode id:\n');
    if (detected.length) {
      for (let i = 0; i < detected.length; i++) {
        const d = detected[i];
        output.write(`  ${i + 1}) ${d.nodeId} (${d.key})\n`);
      }
      output.write(`  ${detected.length + 1}) Enter manually\n`);
      const nodeDefault = defaultNodeChoice(detected, nodeId);
      const nodeRaw = await ask(
        `Choose [1-${detected.length + 1}] (default ${nodeDefault}): `,
      );
      const parsed = parseNodeFromMenu(nodeRaw, detected, nodeId);
      if (parsed === null) {
        const manual = await ask(`Node id (${nodeId}): `);
        nodeId = manual.trim() || nodeId;
      } else {
        nodeId = parsed;
      }
    } else {
      const manual = await ask(`Node id (${nodeId}): `);
      nodeId = manual.trim() || nodeId;
    }

    output.write('\nSummary:\n');
    output.write(`  Role: ${role}\n`);
    output.write(`  Node: ${nodeId}\n`);
    const confirmRaw = await ask('\nProceed? [y/N]: ');
    const confirmed = parseConfirm(confirmRaw);

    return { role, nodeId, confirmed };
  } finally {
    rl?.close();
  }
}
