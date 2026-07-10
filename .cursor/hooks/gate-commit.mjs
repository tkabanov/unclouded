#!/usr/bin/env node
// gate-commit.mjs — PreToolUse(Bash) hook. WARNING-ONLY + FAIL-OPEN: never blocks (always exit 0).
//
// When the Bash command is a `git commit`, run `ai-control check` and surface a WARNING (as context)
// if it fails. Warning-only on purpose: the blocking flip (PreToolUse exit 2) is a LATER one-line toggle
// once you trust it on real tasks. Escape hatch: a commit message containing [skip-control] suppresses
// the check. The matcher only scopes us to the Bash tool; this script inspects the command string.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function readInput() {
  try {
    let raw = readFileSync(0, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip a leading UTF-8 BOM (JSON.parse rejects it)
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}
// True if any top-level segment is a `git <sub>` invocation. Tighter than a bare word-match: the segment
// must START with `git` and the first positional token (after -C/-c value pairs and flags) must be the
// subcommand — so `echo "git commit"` and `git log --grep commit` do not false-positive.
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
  if ((input.tool_name || '') !== 'Bash' || !isGitCommit(cmd)) process.exit(0); // not a commit → silent no-op

  if (/\[skip-control\]/i.test(cmd)) {
    process.stdout.write('gate-commit: [skip-control] present — ai-control check skipped (intentional override).\n');
    process.exit(0);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '..', '..');
  const cli = resolve(here, '..', 'tools', 'ai-control.mjs');

  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [cli, 'check'], { cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024 });
  } catch (e) {
    code = typeof e.status === 'number' ? e.status : 1;
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }

  if (code === 0) {
    process.stdout.write('gate-commit: ai-control check OK — control state consistent, gates fresh, generated views in sync.\n');
  } else {
    process.stdout.write(`${[
      'WARNING gate-commit (non-blocking): `ai-control check` FAILED before this commit.',
      out.trimEnd(),
      'Fix it (e.g. `node .claude/tools/ai-control.mjs sync`, re-run + rebind gates, declare requiredDocs),',
      'or put [skip-control] in the commit message to intentionally bypass. (warning-only — commit NOT blocked.)',
    ].join('\n')}\n`);
  }
} catch {
  // fail-open
}
process.exit(0);
