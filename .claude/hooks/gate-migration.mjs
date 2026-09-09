#!/usr/bin/env node
// gate-migration.mjs — OPTIONAL PreToolUse hook for database migrations.
// WARNING-ONLY + FAIL-OPEN: never blocks (always exit 0).
//
// Wire this ONLY if your project applies DB migrations through a tool (e.g. a migration MCP tool, or a
// `Bash` command that runs your migrator). Set the matcher in settings.json to that tool's name. Until
// you build artifact-bound approvals, this hook just reminds you that a human must have reviewed the
// migration SQL before apply. The blocking flip (exit 2) is a LATER toggle once you trust it.
import { readFileSync } from 'node:fs';

function readInput() {
  try {
    let raw = readFileSync(0, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}

try {
  const input = readInput();
  const ti = input.tool_input || {};
  const name = ti.name || ti.migration_name || ti.version || ti.file || '(unnamed migration)';
  process.stdout.write(`${[
    `WARNING gate-migration (non-blocking): a migration apply was intercepted — "${name}".`,
    'Before applying, confirm a human REVIEWED this migration (the real security gate) and that gates are',
    'green. Migrations should be additive where possible; do not loosen existing access policies silently.',
    '(warning-only — apply NOT blocked.)',
  ].join('\n')}\n`);
} catch {
  // fail-open
}
process.exit(0);
