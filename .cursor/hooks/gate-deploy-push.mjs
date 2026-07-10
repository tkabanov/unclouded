#!/usr/bin/env node
// gate-deploy-push.mjs — PreToolUse hook for two surfaces:
//   • git push  → matcher Bash (this script inspects the command string)
//   • deploy    → wire to your deploy tool's name (any non-Bash tool this hook is matched on)
// WARNING-ONLY + FAIL-OPEN: never blocks (always exit 0).
//
// Surfaces a reminder to confirm gates are green + the change is approved before publishing. The blocking
// flip (exit 2 when an approval is missing) is a LATER toggle once you trust it on real tasks.
import { readFileSync } from 'node:fs';

function readInput() {
  try {
    let raw = readFileSync(0, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function gitSubcommandIs(cmd, sub) {
  if (typeof cmd !== 'string' || !cmd) return false;
  for (let seg of cmd.split(/&&|\|\||[;|\n]/)) {
    seg = seg.trim();
    const m = /^git\b(.*)$/.exec(seg);
    if (!m) continue;
    const tokens = m[1].trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i] === '-C' || tokens[i] === '-c') { i += 2; continue; }
      if (tokens[i].startsWith('-')) { i += 1; continue; }
      break;
    }
    if (tokens[i] === sub) return true;
  }
  return false;
}
const isGitPush = (cmd) => gitSubcommandIs(cmd, 'push');

try {
  const input = readInput();
  const tool = input.tool_name || '';
  if (tool === 'Bash' && isGitPush(input.tool_input?.command || '')) {
    process.stdout.write(`${[
      'WARNING gate-push (non-blocking): git push intercepted.',
      'Confirm gates are green and the change was reviewed/approved before publishing. (warning-only — push NOT blocked.)',
    ].join('\n')}\n`);
  } else if (tool !== 'Bash' && tool) {
    // wired to a deploy tool → warn generically
    process.stdout.write(`${[
      `WARNING gate-deploy (non-blocking): "${tool}" intercepted (deploy surface).`,
      'Confirm gates are green and the deploy was approved. (warning-only — deploy NOT blocked.)',
    ].join('\n')}\n`);
  }
  // Bash non-push command → silent no-op
} catch {
  // fail-open
}
process.exit(0);
