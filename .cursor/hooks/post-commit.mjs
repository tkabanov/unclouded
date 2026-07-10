#!/usr/bin/env node
// post-commit.mjs — PostToolUse(Bash) hook. FAIL-OPEN: never blocks (PostToolUse cannot block anyway;
// always exit 0).
//
// After a `git commit`, best-effort record the delivery on the active task (uncommitted → committed) via
// ai-control and re-render the generated views, so the control plane's deliveryState tracks reality. It
// fires on an explicit commit, advances ONE axis, and only when there is an active uncommitted task. It
// never regresses a pushed/deployed task. Swallows every error.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

function readInput() {
  try {
    let raw = readFileSync(0, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}
// Tighter than a bare word-match (this script MUTATES state, so a false-positive matters most here).
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
const isGitCommit = (cmd) => gitSubcommandIs(cmd, 'commit');

try {
  const input = readInput();
  const cmd = input.tool_input?.command || '';
  if ((input.tool_name || '') !== 'Bash' || !isGitCommit(cmd)) process.exit(0); // not a commit → no-op

  // Best-effort failure guard: if the tool response shows the commit did not complete, record nothing.
  const resp = typeof input.tool_response === 'string'
    ? input.tool_response
    : JSON.stringify(input.tool_response ?? input.tool_result ?? '');
  if (/nothing to commit|no changes added|did not match any files|\berror:/i.test(resp)) {
    process.stdout.write('post-commit: commit did not complete — nothing recorded.\n');
    process.exit(0);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '..', '..');
  const cli = resolve(here, '..', 'tools', 'ai-control.mjs');
  const run = (args) => execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024 });

  let active = null;
  try {
    const tasks = JSON.parse(readFileSync(join(root, '.ai', 'control', 'tasks.json'), 'utf8'));
    active = (tasks.tasks || []).find(
      (x) => (x.state === 'in_progress' || x.state === 'review') && (!x.delivery || x.delivery === 'uncommitted'),
    ) || null;
  } catch { active = null; }

  if (!active) {
    process.stdout.write('post-commit: no active uncommitted task — commit not recorded in the control plane (ok).\n');
    process.exit(0);
  }

  let head = '';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 }).trim(); } catch { head = ''; }
  try {
    run(['task', 'deliver', active.id, 'committed', ...(head ? ['--commit', head] : [])]);
    run(['sync']);
    process.stdout.write(`post-commit: recorded delivery committed for ${active.id}${head ? ` @ ${head.slice(0, 7)}` : ''} + re-synced generated views.\n`);
  } catch (e) {
    process.stdout.write(`post-commit: best-effort delivery record skipped (${String(e.message || 'error').split('\n')[0]}).\n`);
  }
} catch {
  // fail-open
}
process.exit(0);
