---
name: test-list
description: >-
  Runs a sequential QA loop over a markdown scenario checklist: for each untested
  item invokes `/test`, marks the heading `— TESTED` on PASS, skips already-tested
  items, and stops on the first FAIL/BLOCKED. Invoke as `/test-list <path>` (e.g.
  docs/tmp-individual-subscription-test-scenarios.md). Use when the user wants to
  walk a numbered/scenario list end-to-end via browser acceptance tests.
disable-model-invocation: true
user-invocable: true
argument-hint: "[path to scenario checklist.md] [optional: section/id filter]"
---

# Scenario list runner (`/test-list`)

You are running a **sequential acceptance-test loop** over a markdown checklist:

> `$ARGUMENTS`

For **each** untested list item you invoke the project skill **`/test`**
(`.cursor/skills/test/SKILL.md`) with that item’s scenario text. Reply in the
project’s reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user).

## Hard boundaries

- Follow all boundaries of `/test` (no app code edits, no commits, Playwright MCP).
- The **only** allowed file edit is appending / removing the progress marker
  ` — TESTED` on scenario headings in the checklist file named in `$ARGUMENTS`.
- Do **not** invent scenarios; only run items present in the file.
- Before parity claims, read `docs/product-overrides.md` — overrides win.

## 1. Resolve the checklist

Parse `$ARGUMENTS`:

| Part | Meaning |
|------|---------|
| **Path** | Markdown checklist (required), e.g. `docs/tmp-individual-subscription-test-scenarios.md` |
| **Filter** (optional) | Limit to a section or ID prefix, e.g. `0`, `§0`, `SUB-ENTRY`, `SUB-UP-F2P-001` |

If the path is missing or the file cannot be read, ask **one** crisp question, then stop.

## 2. Identify list items

A **testable item** is a leaf scenario heading in the checklist, typically:

```markdown
### SUB-ENTRY-001 — Settings → Subscription (полный экран)
```

or a numbered top-level checklist item the user pointed at:

```markdown
## 1. example
```

**Include** as one item:

- `### <ID> — <title>` scenario blocks (and the following table / Steps / Expected until the next `###` or `##`)
- Or, if the file is a flat numbered list without `###` IDs, each `## N. …` / `N. …` entry the user is treating as a unit

**Exclude:**

- Intro / prep / seed / auth tables
- Parent section headers that only group children (`## 2. Free — locked features`) when child `###` scenarios exist — run the **children**, not the parent
- Items whose heading already contains the marker `— TESTED` (any spacing variant: `— TESTED`, `– TESTED`, `- TESTED`)

Build an ordered queue of **untested** items (document order). Restate the queue to the user (id + title only) before starting.

If the queue is empty: report that every matching item is already `— TESTED` (or none matched the filter) and stop.

## 3. Loop (one item at a time)

Process the queue **strictly in order**. Do not parallelize. Do not skip ahead.

```
for each item in untested queue:
  1. Announce: "Testing N/M: <heading without TESTED>"
  2. Read the item body (preconditions, steps, expected) from the checklist
  3. Invoke /test with that body as the scenario
     → Read and follow .cursor/skills/test/SKILL.md end-to-end
     → Pass the item title + Steps/Expected/Preconditions as $ARGUMENTS to /test
  4. Read /test Result: PASS | FAIL | BLOCKED
  5. Branch:
     PASS    → mark item TESTED in the file → continue to next item
     FAIL    → STOP the loop (do not mark, do not continue)
     BLOCKED → STOP the loop (do not mark, do not continue)
```

### Marking on PASS

Edit the checklist heading in place. Append exactly ` — TESTED` to the heading text
(after the existing title, still on the same `#` / `##` / `###` line).

**Before:**

```markdown
### SUB-ENTRY-001 — Settings → Subscription (полный экран)
```

**After:**

```markdown
### SUB-ENTRY-001 — Settings → Subscription (полный экран) — TESTED
```

**Before:**

```markdown
## 1. example
```

**After:**

```markdown
## 1. example — TESTED
```

Rules:

- Never duplicate the marker if it is already present.
- Do not rewrite the rest of the file.
- Persist the edit to disk **before** starting the next item (so a later `/test-list` can resume).

### Skip already-tested

On every `/test-list` start (including resume), rebuild the queue from the file on disk and **omit** headings that already end with / contain `— TESTED`. Only unmarked items run.

## 4. Stop conditions

Stop the loop when **either**:

1. **All** matching items are PASS and marked `— TESTED`, or
2. **Any** item returns FAIL or BLOCKED from `/test`.

On stop because of FAIL/BLOCKED:

- Leave that item **unmarked**
- Keep prior `— TESTED` marks
- Surface the `/test` report for the failing item
- Tell the user how to resume: re-run `/test-list <same-path> [same-filter]` — tested items will be skipped

## 5. Progress report (required)

After each item and at the end, keep a running board:

```markdown
# Test-list progress: [checklist filename]

**Filter:** [none | …]
**Result:** IN_PROGRESS | ALL_PASSED | STOPPED_ON_FAIL | STOPPED_ON_BLOCKED

| # | Item | Status |
|---|------|--------|
| 1 | SUB-ENTRY-001 — … | TESTED |
| 2 | SUB-ENTRY-002 — … | FAIL (stopped) |
| 3 | SUB-ENTRY-003 — … | skipped |

## Current item report
[Paste or summarize the latest /test report]
```

When **ALL_PASSED**, confirm every matching heading in the file now has `— TESTED`.

## 6. Cleanup

- Close the Playwright browser when the loop ends (same as `/test`), unless the user asks to keep it open.
- Between items, reuse the browser session when auth/state still matches the next item’s preconditions; otherwise log out / switch user as `/test` requires.

## Example invocations

```text
/test-list docs/tmp-individual-subscription-test-scenarios.md

/test-list docs/tmp-individual-subscription-test-scenarios.md SUB-ENTRY

/test-list docs/tmp-individual-subscription-test-scenarios.md 0

/test-list docs/tmp-workplace-test-scenarios.md WP-ADM
```

Resume after a failure (same command): already-marked `— TESTED` items are skipped; the first unmarked matching item runs next.
