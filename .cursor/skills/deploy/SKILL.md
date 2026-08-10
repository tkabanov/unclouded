---
name: deploy
description: >-
  Commits current work, deploys Supabase (pending migrations + changed edge
  functions), then pushes to git. Invoke as `/deploy` or `/deploy <message>`.
  Use when the user wants to publish local changes to the linked Supabase
  project and remote git in one shot.
disable-model-invocation: true
user-invocable: true
argument-hint: "[optional commit message or scope: functions=name1,name2]"
---

# Deploy (`/deploy`)

You are running a **publish pipeline** for:

> `$ARGUMENTS`

`/deploy` **is** explicit user authorization to **commit**, **apply/deploy Supabase**, and **git push**. Do not ask again for permission to commit/push/deploy unless a hard blocker applies (secrets, force-push, empty tree, auth failure).

Reply in the project's reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user). Commit messages stay in English.

## Defaults

| Item | Value |
|------|--------|
| Supabase project ref | `szkextipgpupqoppccoy` (from `supabase/config.toml` `project_id`) |
| Edge deploy | **CLI** (`npx supabase functions deploy …`) — auto-bundles `_shared` imports |
| Migrations | Prefer `npx supabase db push --linked` (or MCP `list_migrations` + `apply_migration`) |
| Git remote | tracked upstream of current branch (`git push -u origin HEAD` if no upstream) |
| Scope | Commit meaningful app changes; deploy **pending migrations** + **changed** edge functions only |

Parse `$ARGUMENTS`:

- Free text → commit message hint (still rewrite into a proper why-focused message from the diff).
- `functions=a,b` or `all-functions` → override which edge functions to deploy.
- `migrations-only` / `functions-only` / `git-only` → skip other stages (still report skips).

## Hard boundaries

- **Never** commit secrets (`.env`, `*.pem`, credential files, `tmp_cron_secret.txt`, etc.).
- **Never** `--force` / `--force-with-lease` push unless the user typed that in `$ARGUMENTS`.
- **Never** `git commit --amend` unless the user-rules amend conditions are all met.
- **Never** `--no-verify` / skip hooks unless the user explicitly asked.
- Do **not** deploy Vercel / frontend hosting unless `$ARGUMENTS` says so (CI build only; publish is separate).
- Do **not** change application code during `/deploy` except fixing a deploy blocker the user already approved.
- Prefer **not** staging junk: `tmp_*`, `docs/tmp-*`, `scripts/__pycache__/`, `frontend/node_modules/`, `.cursor/hooks/*.log`, seed scratch scripts the user did not ask to ship.

## Progress checklist

Copy and update as you go:

```
Deploy progress:
- [ ] 1. Inspect
- [ ] 2. Commit
- [ ] 3. Supabase migrations
- [ ] 4. Supabase edge functions
- [ ] 5. Git push
- [ ] 6. Report
```

---

## 1. Inspect

Run in parallel:

```bash
git status
git diff
git diff --staged
git log -5 --oneline
git branch -vv
```

Also note Supabase touchpoints in the diff:

- `supabase/migrations/**` → migration stage required
- `supabase/functions/<name>/**` or `supabase/functions/_shared/**` → deploy those functions (if `_shared` changed, redeploy **every function that imports the changed shared file**, or ask once if ambiguous — default: redeploy all functions listed in `supabase/config.toml` that are not staging-only unless scope narrows it)

If the working tree is clean **and** there is nothing to push **and** no pending remote migrations / function deltas, stop with a short “nothing to deploy” report.

Restate a one-line plan to the user, then execute without waiting.

---

## 2. Commit

If there are changes to ship:

1. Stage **intentional** paths only (`git add <paths>`). Do not blanket-add the whole repo when status is noisy.
2. Draft a concise English commit message (1–2 sentences, why > what) matching recent `git log` style.
3. Commit via HEREDOC (PowerShell-safe form is OK on Windows):

```bash
git commit -m "$(cat <<'EOF'
Your message here.

EOF
)"
```

On Windows PowerShell, if HEREDOC is unavailable, use:

```powershell
git commit -m "Your message here."
```

4. If commit fails due to a hook, **fix and create a new commit** (do not amend a failed commit).
5. If there is nothing to commit but unpushed commits exist, skip to stage 3.

`/deploy` overrides the usual “only commit when asked” rule — this invocation **is** the ask.

---

## 3. Supabase migrations

Order matters: **migrations before edge functions before git push** (remote frontend must not get ahead of missing RPCs/schema).

1. Discover pending migrations:

```bash
npx supabase migration list --linked
```

Or MCP `plugin-supabase-supabase` → `list_migrations` with `project_id: szkextipgpupqoppccoy`, then diff against files in `supabase/migrations/`.

2. Apply pending ones:

```bash
npx supabase db push --linked
```

Fallback: MCP `apply_migration` with `name` (snake_case without timestamp) + full SQL `query` from the migration file — one migration at a time, in timestamp order.

3. On failure: **stop**. Do not push. Report the SQL/CLI error and the last successful migration.

Hooks: `mcp__supabase__apply_migration` is gated warning-only — proceed; surface the warning in the final report if shown.

---

## 4. Supabase edge functions

Prefer **CLI** (correct multi-file bundles). Do **not** use MCP `deploy_edge_function` unless CLI is unavailable — MCP requires manually shipping every file and easily misses `_shared`.

### Which functions

| Situation | Deploy |
|-----------|--------|
| Diff touches `supabase/functions/<name>/` | That `name` |
| Diff touches `supabase/functions/_shared/` | All consumers of the changed shared modules (if unclear → all non-`chat-staging` functions under `supabase/functions/`, or `functions=…` from args) |
| `$ARGUMENTS` has `functions=a,b` | Only those |
| `$ARGUMENTS` has `all-functions` | Every function directory except `_shared` |
| No function / shared changes | Skip (say so) |

### Command

From repo root:

```bash
npx supabase functions deploy <name> --project-ref szkextipgpupqoppccoy
```

Read `verify_jwt` from `supabase/config.toml` `[functions.<name>]`. The CLI uses config; do not flip JWT unless the user asked.

Deploy changed functions sequentially (or a small parallel batch). On first failure: stop, report which succeeded, do **not** push if the failure leaves API incompatible with the commit about to be published — ask the user whether to push frontend-only.

`chat-staging` is optional/dev unless the diff touched it or args include it.

---

## 5. Git push

```bash
git push -u origin HEAD
```

- Push **after** successful migration + required function deploys (or after confirming those stages were intentionally skipped).
- If push is rejected (non-fast-forward): **stop**, show status, do not force-push.
- Warning-only `gate-deploy-push` hook may print a reminder — continue; mention it in the report.

---

## 6. Report (required)

```markdown
# Deploy report

**Result:** OK | PARTIAL | FAILED
**Branch:** …
**Commit:** `<sha>` — <subject>
**Remote:** pushed | not pushed (<reason>)

## Supabase
- **Migrations:** none pending | applied: `…` | failed: …
- **Edge functions:** skipped | deployed: `a`, `b` | failed: …

## Notes
- Hook warnings, skipped junk paths, follow-ups (Vercel manual publish, secrets, smoke)
```

On **OK**, one short Russian summary is enough above the report block.

---

## Example invocations

```text
/deploy
/deploy fix payment recovery notice on subscription tab
/deploy functions=stripe-portal,stripe-checkout
/deploy all-functions
/deploy migrations-only
/deploy git-only
```
