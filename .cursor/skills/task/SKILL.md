---
name: task
description: Coder-side lifecycle runner for ONE task through the ai-control control plane. Invoke as `/task <TASK-ID>` to start → checkpoint → run gates → adversarially verify → finish a task, recording every step in .ai/control so the PM can review and accept. Use when you are the CODER chat picking up a task the PM created. Project specifics live in .ai/PROJECT.md.
disable-model-invocation: true
user-invocable: true
argument-hint: "[task-id]"
---

# Task runner (coder chat)

You are the CODER chat executing task `$ARGUMENTS`. The PM chat created/readied this task in the control
plane; you drive it through its lifecycle. Source of truth = `.ai/control/` (machine-written via
`ai-control`), rendered into `.ai/current-state.md` / `current-focus.md` / `tasks.md` / `worklog.md` —
those four are GENERATED, never hand-edit them. **Read `.ai/PROJECT.md` for the stack, boundaries, and
rules.** Default to English everywhere (replies, code, comments, commit messages, notes); a project may set a different reply language in `.ai/PROJECT.md`.

ai-control CLI: `node .claude/tools/ai-control.mjs <cmd>` (status · sync · check · doctor · task … · gate set …).

## 1. Orient (read from disk, not memory)
- `node .claude/tools/ai-control.mjs status` — milestone, the active task, gate freshness, working tree.
- Read the GENERATED `.ai/current-state.md` + `.ai/current-focus.md`, then `.ai/PROJECT.md` and the task's
  `requiredDocs`.
- Confirm the active task is `$ARGUMENTS` and read its scope (in / out / gates / requiredDocs) from
  `.ai/control/tasks.json`.

## 2. Start
- `node .claude/tools/ai-control.mjs task start $ARGUMENTS` — ready→in_progress, baselines requiredDoc
  hashes, records the event. (Refuses if another task is already in_progress — finish/block it first.)
- Plan in the user's language BEFORE coding. Restate the mode the PM set (max | ultracode) and the model.

## 3. Build (respect the boundaries in .ai/PROJECT.md)
- Follow the architecture boundary (e.g. UI → hooks → services → data; no direct data access from
  components; no secrets in the frontend). Keep generated types/contracts as truth; mappers pure.
- Migrations / schema / security changes: WRITE only, do NOT apply. The PM reviews it and approves before
  apply.
- Checkpoint as you go: `… task checkpoint $ARGUMENTS --note "…" --docs-reviewed <paths> --docs-changed
  <paths>` — declare the owner docs you read / changed (the machine verifies the declaration by hash; the
  PM verifies the content).

## 4. Gates (green before finish)
- Run the project's gates (lint / test / build / typecheck — see `.ai/PROJECT.md`). Record with
  `… gate set <lint|build|typecheck> <pass|fail>` (rebinds gates to the current HEAD + code fingerprint).

## 5. Adversarially verify (mandate for L/M slices; small low-risk slices may self-review)
Invoke the reviewer subagents by name (Agent tool, `subagent_type`); fix every must-fix before finishing:
- `security-reviewer` — authz / secrets / input-validation / access-control for any security-sensitive slice.
- `architecture-reviewer` — module boundaries, no direct data access from UI, owner contracts.
- `fidelity-reviewer` — spec/visual parity + honest placeholders + FIDELITY to the ticket (built exactly
  what was scoped, no drift / scope-creep).
Migration/security review is the PM's job (human), NOT a subagent.

## 6. Finish → hand back to the PM
- `… task finish $ARGUMENTS --summary "…" [--commit <sha>] --docs-reviewed <paths> --docs-changed <paths>`
  (in_progress→review).
- `… sync` then `… check` — must exit 0 (gates fresh, no drift, requiredDocs declared). Fix whatever it reports.
- Tell the user to relay to the PM for `task accept $ARGUMENTS`. Commit/push only when the user confirms;
  the PM owns the final accept gate. Never hand-edit the generated views — `ai-control sync` renders them.
