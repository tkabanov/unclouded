#!/usr/bin/env node
// sessionstart.mjs — SessionStart hook. CONTEXT-ONLY + FAIL-OPEN: never blocks (always exit 0).
//
// Injects `ai-control status` as session context so a fresh chat orients before touching code.
// Per the Claude Code hook contract: SessionStart stdout is surfaced to the model as context and the
// exit code cannot block session boot. We ALWAYS exit 0 and swallow every error.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

try {
  const here = dirname(fileURLToPath(import.meta.url)); // <repo>/.claude/hooks
  const root = resolve(here, '..', '..'); // <repo>
  const cli = resolve(here, '..', 'tools', 'ai-control.mjs');

  let status = '';
  try {
    status = execFileSync(process.execPath, [cli, 'status'], {
      cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024,
    });
  } catch (e) {
    status = `${e.stdout || ''}${e.stderr ? `\n${e.stderr}` : ''}`;
  }

  const out = [
    '== control plane — session start ==',
    'Read .ai/current-state.md + .ai/current-focus.md (+ .ai/PROJECT.md for project rules) before any non-trivial work.',
    'Source of truth = .ai/control/ (machine-written via ai-control). The 4 hot .md views',
    '(current-state / current-focus / tasks / worklog) are GENERATED — never hand-edit them.',
    '',
    (status || '(ai-control status produced no output)').trimEnd(),
  ];
  process.stdout.write(`${out.join('\n')}\n`);
} catch {
  // fail-open: SessionStart must never disrupt session boot
}
process.exit(0);
