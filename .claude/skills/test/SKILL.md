---
name: test
description: Runs interactive browser acceptance tests of described functionality using the Claude Code Browser pane. Invoke as `/test <scenario>` to navigate the app, execute user flows, assert UI/network/console behavior, and return a structured pass/fail report. Use when the user wants manual-like E2E verification of a feature, page, or regression scenario — not Vitest unit tests or CI Playwright suites.
disable-model-invocation: true
user-invocable: true
argument-hint: "[scenario description or acceptance criteria]"
---

# Browser test runner (`/test`)

You are executing an **interactive acceptance test** for:

> `$ARGUMENTS`

Drive the app with the **Browser pane** tools (`mcp__Claude_Browser__*`: `preview_start`, `navigate`, `read_page`, `find`, `computer`, `form_input`, `read_console_messages`, `read_network_requests`, `javascript_tool`, `browser_batch`). This is exploratory E2E verification — not a replacement for `npm run test` / Vitest. Reply in the project's reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user).

## Hard boundaries

- **Do not** edit application code, migrations, or tests unless the user explicitly asks to fix what you found.
- **Do not** commit, push, or apply migrations.
- **Do not** use `javascript_tool` to *perform* the flow — it is for inspection/assertions only. Clicks and typing go through `computer` / `form_input` so the test exercises the real UI.
- Never enter real credentials, cards or personal data — only the QA fixtures below.
- Before parity claims against Bubble/Lovable/docs, read `docs/product-overrides.md` — overrides win.

## 1. Parse the scenario

Turn `$ARGUMENTS` into a concrete test plan:

| Field | Source |
|-------|--------|
| **Goal** | One sentence — what "pass" means |
| **Base URL** | User-provided, else `http://localhost:3000` (see `frontend/README.md`) |
| **Auth** | User-provided credentials, else **individual subscription QA:** `sub-free@test.com`, `sub-pro@test.com`, `sub-premium@test.com` (password `qwerty123`, seed: `scripts/seed_individual_subscription_test_users.mjs`). Employer codes: `code2@test.com` … `code5@test.com` (enterprise Pro — not individual billing). **Platform admin:** `admin-qa@test.com` / `qwerty123` → `/admin` (seed: `scripts/seed_platform_admin_test_user.mjs`). |
| **Start path** | Route or entry screen (e.g. `/`, `/employer`, `/settings`) |
| **Steps** | Ordered actions: navigate → click → fill → wait → assert |
| **Assertions** | Visible text/elements, URL, network responses, console errors |
| **Out of scope** | What you will not test in this run |

If `$ARGUMENTS` is empty or ambiguous, ask **one** crisp question (URL or credentials), then proceed with defaults.

Restate the plan to the user before opening the browser.

## 2. Preconditions

1. Start (or attach to) the dev server with `preview_start` using the entry in `.claude/launch.json`; that also opens the Browser pane. If no config exists, create it (`runtimeExecutable: "npm"`, `runtimeArgs: ["run","dev"]`, `cwd`-relevant port `3000`) rather than running the server through Bash. For an already-running server or a remote URL, `preview_start` with `url` (or `navigate`) is enough.
2. Confirm the target actually loaded (`read_page`) before asserting anything. If the server is down, say so and stop — do not guess.
3. Optional: `resize_window` with `preset: "desktop"` (or `mobile` when the scenario is mobile-specific).

## 3. Execute (Browser pane workflow)

Standard loop — repeat per step; batch predictable multi-step sequences into one `browser_batch` call:

```
1. navigate                → open the URL (or preview_start on the first step)
2. read_page               → accessibility tree + [ref_N] element refs (prefer this over screenshots)
3. find "<text>"           → locate a ref without dumping the whole tree
4. Interact                → computer {left_click|type|key|hover, ref|coordinate}
                             form_input {ref, value} for inputs / selects / checkboxes
5. Wait                    → computer {action: "wait"} then re-read_page / find until the expected
                             text appears (or the spinner is gone)
6. Verify                  → read_page, read_network_requests, read_console_messages
7. computer {screenshot}   → on failure, or when the user asked for visual proof
```

### Auth (Unclouded default)

- Landing: `/` or `/signup` — login is a **popup dialog**, not a dedicated `/login` route.
- Open login from the landing page, fill email/password (`form_input`), submit, then re-read the page until `/dashboard` (or the scenario target) is rendered.
- If OAuth / 2FA / captcha blocks automation: **stop**, report the blocker, ask the user to complete that step manually, then continue from `read_page`.

### Assertions

| Check | Tool |
|-------|------|
| Element visible / label / role | `read_page`, `find` |
| Page URL | `javascript_tool` → `location.pathname + location.search` |
| API call happened | `read_network_requests` (filter with `urlPattern`: `/rest/`, `/functions/`), then the same tool with `requestId` for the body |
| No JS errors | `read_console_messages` with `onlyErrors: true` |
| Loading finished | `computer {wait}` + `find` for the expected content / absence of the spinner |
| Visual regression | `computer {screenshot}` (only when the check is genuinely visual) |

After **each critical assertion**, record **pass** or **fail** with evidence (accessibility-tree excerpt, request URL + status, console line).

### Retry discipline

- Max **2** retries per step; each retry needs a new hypothesis (different ref, longer wait, scroll).
- If **4** consecutive failures on the same goal, stop and report blocker + best next step.

## 4. Report (required output)

Use this template:

```markdown
# Test report: [short title]

**Scenario:** [restated from $ARGUMENTS]
**Environment:** [URL, viewport, date]
**Result:** PASS | FAIL | BLOCKED

## Summary
[1–3 sentences]

## Steps
| # | Action | Expected | Actual | Status |
|---|--------|----------|--------|--------|
| 1 | … | … | … | pass/fail |

## Failures (if any)
- **[F1]** …
  - Evidence: page excerpt / request + status / console line / screenshot

## Blockers (if any)
- …

## Notes
- Console warnings, flaky waits, product-override deltas vs docs
```

On **PASS**, still list console errors/warnings if non-blocking.

On **FAIL**, include at least one `computer {action: "screenshot"}`.

## 5. Cleanup

- `tabs_close` the tab(s) you opened when done, unless the user wants the session kept open.
- Leave the dev server running (`preview_stop` only if you started it just for this run and the user wants it down).
- Reset any emulated viewport with `resize_window {preset: "desktop"}` if you changed it.

## Browser tool quick reference

| Intent | Tool |
|--------|------|
| Start dev server + open pane | `preview_start` (`name` from `.claude/launch.json`, or `url`) |
| Open URL / go back | `navigate` |
| Page structure + element refs | `read_page` |
| Search for text/role | `find` |
| Click / type / key / hover | `computer` (`left_click`, `type`, `key`, `hover`, `scroll`) |
| Input / select / checkbox value | `form_input` |
| Wait | `computer` (`wait`) + re-`read_page` |
| Network | `read_network_requests` |
| Console | `read_console_messages` |
| Screenshot / zoom | `computer` (`screenshot`, `zoom`) |
| JS one-liner (inspection only) | `javascript_tool` |
| Tabs | `tabs_context`, `tabs_create`, `tabs_select`, `tabs_close` |
| Viewport | `resize_window` |
| Multi-step in one round trip | `browser_batch` |
| Server logs | `preview_logs` |

If a Playwright MCP server is configured for this project, its `mcp__playwright__browser_*` tools are an acceptable substitute — keep the same loop and the same report. When the user's real Chrome session is required (existing logins), use `mcp__claude-in-chrome__*` instead.

## Common Unclouded routes

| Area | Path |
|------|------|
| Landing / login popup | `/`, `/signup` |
| Onboarding | `/onboarding` |
| Dashboard | `/dashboard` |
| Chat | `/chat` |
| Employer portal | `/employer` |
| Settings | `/settings` |
| Journal | `/journal` |
| Paths | `/paths` |

Production smoke (only when user specifies): `https://uncloud360.vercel.app`

## Example invocations

```text
/test Employer enrollment codes: login as code2@test.com, open /employer, verify codes panel loads and lists at least one code

/test Settings subscription tab shows current tier and no console errors

/test After login, /dashboard shows reassessment CTA for a user with completed onboarding
```
