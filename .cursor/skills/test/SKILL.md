---
name: test
description: Runs interactive browser acceptance tests of described functionality using Playwright MCP (user-playwright). Invoke as `/test <scenario>` to navigate the app, execute user flows, assert UI/network/console behavior, and return a structured pass/fail report. Use when the user wants manual-like E2E verification of a feature, page, or regression scenario — not Vitest unit tests or CI Playwright suites.
disable-model-invocation: true
user-invocable: true
argument-hint: "[scenario description or acceptance criteria]"
---

# Browser test runner (`/test`)

You are executing an **interactive acceptance test** for:

> `$ARGUMENTS`

Use **Playwright MCP** (`user-playwright`) via `GetMcpTools` + `CallMcpTool`. This is exploratory E2E verification — not a replacement for `npm run test` / Vitest. Reply in the project's reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user).

## Hard boundaries

- **Do not** edit application code, migrations, or tests unless the user explicitly asks to fix what you found.
- **Do not** commit, push, or apply migrations.
- **Do not** use `browser_run_code_unsafe` unless simpler MCP tools cannot express the assertion.
- Prefer **`user-playwright`**; use `cursor-ide-browser` only if `user-playwright` is unavailable or the user asks.
- Before parity claims against Bubble/Lovable/docs, read `docs/product-overrides.md` — overrides win.

## 1. Parse the scenario

Turn `$ARGUMENTS` into a concrete test plan:

| Field | Source |
|-------|--------|
| **Goal** | One sentence — what "pass" means |
| **Base URL** | User-provided, else `http://localhost:3000` (see `frontend/README.md`) |
| **Auth** | User-provided credentials, else **individual subscription QA:** `sub-free@test.com`, `sub-pro@test.com`, `sub-premium@test.com` (password `qwerty123`, seed: `scripts/seed_individual_subscription_test_users.mjs`). Employer codes: `code2@test.com` … `code5@test.com` (enterprise Pro — not individual billing). |
| **Start path** | Route or entry screen (e.g. `/`, `/employer`, `/settings`) |
| **Steps** | Ordered actions: navigate → click → fill → wait → assert |
| **Assertions** | Visible text/elements, URL, network responses, console errors |
| **Out of scope** | What you will not test in this run |

If `$ARGUMENTS` is empty or ambiguous, ask **one** crisp question (URL or credentials), then proceed with defaults.

Restate the plan to the user before opening the browser.

## 2. Preconditions

1. Confirm the app is reachable at the base URL (e.g. `curl -s -o /dev/null -w "%{http_code}" <url>` or check an existing dev-server terminal). If down, tell the user to run `npm run dev` in `frontend/` and wait — do not guess.
2. Call `GetMcpTools` for `user-playwright` before the first MCP action.
3. Optional: `browser_resize` to desktop (1280×720) unless the scenario is mobile-specific.

## 3. Execute (Playwright MCP workflow)

Standard loop — repeat per step:

```
1. browser_navigate / browser_tabs (action: new)
2. browser_snapshot  → read accessibility tree + element refs
3. browser_find      → locate text/refs without full snapshot when possible
4. Interact          → browser_click | browser_type | browser_fill_form |
                       browser_select_option | browser_press_key | browser_hover
5. browser_wait_for  → text appears/disappears or short time delay
6. Verify            → snapshot, browser_network_requests, browser_console_messages
7. browser_take_screenshot → on failure or when user asked for visual proof
```

### Auth (Unclouded default)

- Landing: `/` or `/signup` — login is a **popup dialog**, not a dedicated `/login` route.
- Open login from the landing page, fill email/password, submit, wait for redirect to `/dashboard` or the scenario target.
- If OAuth / 2FA / captcha blocks automation: **stop**, report blocker, ask user to complete that step manually, then continue from `browser_snapshot`.

### Assertions

| Check | Tool |
|-------|------|
| Element visible / label / role | `browser_snapshot`, `browser_find` |
| Page URL | `browser_evaluate` with `() => location.pathname + location.search` |
| API call happened | `browser_network_requests` + `browser_network_request` (filter `/rest/`, `/functions/`) |
| No JS errors | `browser_console_messages` with `level: "error"` |
| Loading finished | `browser_wait_for` with `textGone` for spinners or `text` for expected content |

After **each critical assertion**, record **pass** or **fail** with evidence (snapshot excerpt, request index, console line).

### Retry discipline

- Max **2** retries per step; each retry needs a new hypothesis (different ref, wait, scroll).
- If **4** consecutive failures on the same goal, stop and report blocker + best next step.

## 4. Report (required output)

Use this template:

```markdown
# Test report: [short title]

**Scenario:** [restated from $ARGUMENTS]
**Environment:** [URL, browser, date]
**Result:** PASS | FAIL | BLOCKED

## Summary
[1–3 sentences]

## Steps
| # | Action | Expected | Actual | Status |
|---|--------|----------|--------|--------|
| 1 | … | … | … | pass/fail |

## Failures (if any)
- **[F1]** …
  - Evidence: snapshot / network #N / console / screenshot path

## Blockers (if any)
- …

## Notes
- Console warnings, flaky waits, product-override deltas vs docs
```

On **PASS**, still list console errors/warnings if non-blocking.

On **FAIL**, include at least one `browser_take_screenshot` (filename under workspace if saved).

## 5. Cleanup

- `browser_close` when done, unless the user wants the session kept open.

## MCP tool quick reference

| Intent | Tool |
|--------|------|
| Open URL | `browser_navigate` |
| Page structure | `browser_snapshot` |
| Search text | `browser_find` |
| Click / type / form | `browser_click`, `browser_type`, `browser_fill_form` |
| Dropdown | `browser_select_option` |
| Wait | `browser_wait_for` |
| Network | `browser_network_requests`, `browser_network_request` |
| Console | `browser_console_messages` |
| Screenshot | `browser_take_screenshot` |
| JS one-liner | `browser_evaluate` |
| Tabs | `browser_tabs` |

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
