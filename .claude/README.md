# `.claude/` — Claude Code config for Unclouded

Moved here from `.cursor/` and adapted to Claude Code's formats.

## Layout

| Path | What it is |
|------|------------|
| `settings.json` | Project hooks (shared, committed). Warning-only + fail-open. |
| `settings.local.json` | Machine-local overrides (permissions). Not shared. |
| `settings.template.json` | Reference copy of every hook block, incl. the opt-in `Stop` hook. |
| `launch.json` | Dev-server config for the Browser pane (`preview_start` → `frontend`, port 3000). |
| `rules/` | Always-on rules, imported from the root `CLAUDE.md`. |
| `skills/` | Slash-command skills: `/pm`, `/task`, `/deploy`, `/implementation-plan`, `/test-plan`, `/test`, `/test-list`. |
| `agents/` | Subagents for `/task`: `security-reviewer`, `security-web-reviewer`, `architecture-reviewer`, `fidelity-reviewer`. |
| `hooks/` | Hook scripts (Node ESM, no deps). |
| `tools/ai-control.mjs` | Control-plane CLI: `node .claude/tools/ai-control.mjs status\|check\|doctor\|sync\|task …`. |

## Hooks

All wired hooks **warn, never block** (they always `exit 0`, and swallow their own errors).

| Event | Matcher | Script | Effect |
|-------|---------|--------|--------|
| `SessionStart` | — | `sessionstart.mjs` | Injects `ai-control status` as session context. |
| `PreToolUse` | `Bash` | `gate-commit.mjs` | On `git commit`: runs `ai-control check`, warns on failure. `[skip-control]` in the message bypasses it. |
| `PreToolUse` | `Bash` | `gate-deploy-push.mjs` | On `git push`: reminder that gates must be green and the change approved. |
| `PreToolUse` | `mcp__supabase__apply_migration` | `gate-migration.mjs` | Reminder that a human must review the SQL first. |
| `PreToolUse` | `mcp__supabase__deploy_edge_function` | `gate-deploy-push.mjs` | Same reminder on the deploy surface. |
| `PostToolUse` | `Bash` | `post-commit.mjs` | After a successful `git commit`: records `delivery committed` on the active task + `ai-control sync`. |
| `Stop` | — | `stop.mjs` | **Not wired by default.** Auto-continues the turn while a `cursor-impl-cycle` cycle is active. |

To turn a warning into a real block, make the script `exit 2` (Claude Code treats `PreToolUse` exit 2 as "deny, tell the model why" via stderr).

## What changed vs `.cursor/`

- `hooks.json` (Cursor's hook format) → the `hooks` block in `settings.json` (Claude's format, `${CLAUDE_PROJECT_DIR}`-relative).
- `run-stop.mjs` (Cursor stop contract: `{status, loop_count}` in, `{followup_message}` out) → `stop.mjs`, which translates to Claude's `{"decision":"block","reason":"…"}` and adds a chain cap.
- `rules/product-overrides.mdc` (Cursor `alwaysApply`) → `rules/product-overrides.md`, imported from the root `CLAUDE.md` (Claude Code has no auto-loaded rules dir).
- `/test` was rewritten for the built-in **Browser pane** tools (`mcp__Claude_Browser__*`) instead of Cursor's `GetMcpTools`/`CallMcpTool` + `user-playwright`.
- Supabase MCP tools are now named the Claude way: `mcp__supabase__list_migrations` / `apply_migration` / `deploy_edge_function`.
- Dropped: the `guard-generated.mjs` `preToolUse` entry from `hooks.json` — that script never existed in the repo.
