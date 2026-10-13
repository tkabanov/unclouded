# NCLDD-56 — Test plan (manual + automated)

**Scope:** B2C "Invite a friend", B2B partner portal, referral credits for 1:1 coach sessions, partner commissions, refunds/disputes, link visits, admin referral analytics. **Spec:** YouTrack NCLDD-56 (DoD + QA checklist), `docs/product-overrides.md` OVR-074. **Results go to:** `docs/NCLDD-56-test-report.md`.

**Entry criteria:** migrations `20261013150000…200000` applied (deploy checklist in the test report), `stripe-webhook` + `generate-kota-read` deployed, Stripe endpoint has `invoice.paid`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, frontend deployed. Stripe in **test mode** only.

## 1. Test data

| Account | Role / state | Used in |
|---|---|---|
| `REF-A` | Free user, referrer | B2C flows |
| `REF-B` | Free user, second referrer | isolation |
| `INV-1`, `INV-2`, `INV-3` | new invitees of `REF-A` (signup via link) | Pro, Premium, refund |
| `INV-B1` | invitee of `REF-B` | isolation |
| `PARTNER-1` | confirmed account linked to partner **with** confirmed terms | B2B with commission |
| `PARTNER-2` | account linked to partner **without** terms | "not confirmed" state |
| `PCL-1`, `PCL-2` | clients signed up via partner links | commission, refund |
| `ADMIN` | admin | analytics, linking, terms |
| `USER-X` | plain user, no referrals, not a partner | negative access |

Names for invitees: use a two-word name with a long last name (e.g. "Testa Longsurname") plus one edge case ("Анна Иванова", email-like name `john.doe@x.io`).

## 2. Automated tests

### 2.1 Already in place (run on every change and before deploy)

| Layer | Command / file | Covers |
|---|---|---|
| Unit / component (vitest) | `npm run test` (frontend) | `referralOverviewApi`, `partnerPortalApi`, `referralCoachCreditsApi`, `referralProgramAdminApi`, `coachBookingEntitlements`, `referralLinkClick`, `ReferralComponents`, `PartnerComponents` |
| Edge shared logic | `supabase/functions/_shared/referralPayments.test.ts` (in vitest) | invoice → credit/commission mapping, refund/dispute amounts |
| SQL proofs (rollback) | `supabase/tests/referral_*_proof.sql`, `one_on_one_referral_credit_proof.sql` | attribution lock, ledgers + idempotency, 1:1 credit booking, overview RPC, partner portal RPC, admin analytics, link clicks |
| Gates | `npm run lint`, `npm run build`, `npx tsc --noEmit -p tsconfig.app.json` (count must not grow) | regressions |

Run all 7 proofs **twice**: on PGlite before deploy and in the Supabase SQL editor after the migrations (each must end with `ALL PASS`).

### 2.2 To add (gaps)

| # | Test | Type | Why |
|---|---|---|---|
| A1 | `stripe-webhook` handler: same `invoice.paid` delivered twice → one `referralPayment`, one credit | Deno/vitest with mocked Supabase + Stripe | DoD idempotency at the edge level, not only in SQL |
| A2 | `stripe-webhook`: `charge.refunded` / `dispute.created` / `dispute.closed (won)` → correct reversal calls; charge state re-fetched from Stripe | same | refund path is only proven in SQL today |
| A3 | `generate-kota-read`: booking with `paymentSource = referral_credit` on Free plan → Read generated once | vitest with mocks | new branch in b9a12be |
| A4 | Signup page keeps `?ref=CODE` across navigation (signup → confirm email → login) and sends it on sign-up | component test (`Index.tsx` / signup form) | ticket: attribution must survive page transitions |
| A5 | Sidebar: "Invite a friend" for every user; "Partner portal" only when portal RPC says linked; `/partner` redirects others | component test (`AppSidebar`, router) | DoD sidebar items + access |
| A6 | `BookCoachCard`: referral credit offered for human coach, never for AI sessions; spent before Premium credits | component test | DoD "not applicable to AI session" |
| A7 | Admin: `AdminReferralPartnersTab` sorting by sign-ups / paying / commission; partner without terms shows "not confirmed", no amount | component test | DoD partner comparison |
| A8 | Live API isolation smoke: script that signs in as `REF-A`, `REF-B`, `PARTNER-1`, `USER-X` (test env) and calls `get_my_referral_overview`, `get_my_referral_partner_portal`, admin RPCs; asserts own data only and `42501` for non-admin | node script in `scripts/` (test env only) | repeatable version of the manual access checks |

A1–A7 go into `npm run test`. A8 is run manually after deploy and before go-live.

## 3. Manual test cases

Mark each case Pass / Fail / Blocked with date and evidence (screenshot, Stripe event id, SQL row) in the test report.

### 3.1 B2C — page and link

| ID | Steps | Expected |
|---|---|---|
| M-01 | Log in as `REF-A`, open sidebar | "Invite a friend" item visible, opens `/invite` |
| M-02 | On `/invite` check sections | link + code, Copy button, credits summary (available / earned / used), history, invitees, program rules; English copy |
| M-03 | Click Copy | toast; clipboard has `…/signup?ref=CODE` |
| M-04 | Reload, log out/in, check another day | code and link are the same |
| M-05 | Try to change own code (profile form, direct `profiles` update via devtools/REST) | no UI for it; direct update rejected / ignored |
| M-06 | `USER-X` opens `/invite` | own (empty) data only; no errors |

### 3.2 B2C — attribution

| ID | Steps | Expected |
|---|---|---|
| M-07 | Incognito: open `REF-A` link, sign up `INV-1`, confirm email | `INV-1` appears in `REF-A` list as "First L." (status changes after email confirmation) |
| M-08 | Open link, go to other pages, then back to signup and register `INV-2` | attribution kept |
| M-09 | Name edge cases ("Анна Иванова", email-like name, extra spaces) | only first name + last initial; no full last name, no email anywhere in DOM / network response |
| M-10 | `REF-A` opens own link while logged in / signs up with own code | self-referral not counted |
| M-11 | Invalid / inactive code in `?ref=` | signup works, no attribution, no error shown to user |
| M-12 | `INV-1` tries to change its referrer later (profile update via REST) | rejected; attribution unchanged |

### 3.3 B2C — credits from payments (Stripe test)

| ID | Steps | Expected |
|---|---|---|
| M-13 | `INV-1` buys Pro | `REF-A` gets exactly 1 credit; history row names `INV-1` ("First L.") |
| M-14 | Stripe dashboard → resend the same `invoice.paid` | no second credit |
| M-15 | `INV-1` renewal / plan change to Premium | still 1 credit total for `INV-1` |
| M-16 | `INV-2` buys Premium | +1 credit (total 2) |
| M-17 | `INV-3` buys Pro, then full refund in Stripe (credit unused) | credit removed; history shows reversal |
| M-18 | Refund after the credit was spent on a booking | spent credit not clawed back from the booking; balance behaves per OVR-074 |
| M-19 | Dispute created → closed **won** | credit reversed on create, restored on won |
| M-20 | User who paid before the program launch | no retro credit (OVR-074) |

### 3.4 B2C — using credits for 1:1 coach

| ID | Steps | Expected |
|---|---|---|
| M-21 | `REF-A` (Free) books a human-coach 1:1 | referral credit offered and spent; available −1, used +1; booking shows payment source "referral credit" |
| M-22 | Coach side: open the booking | Kota's Read generated once |
| M-23 | Cancel 24h+ before | credit returned to balance; history shows return |
| M-24 | Cancel <24h | credit not returned |
| M-25 | Premium user with Premium credits + referral credits | referral credit spent first |
| M-26 | AI coaching session | referral credits never offered / not consumed |
| M-27 | 0 referral credits on Free | booking with credit not available; normal paywall |

### 3.5 Link visits

| ID | Steps | Expected |
|---|---|---|
| M-28 | Fresh browser opens `REF-A` link | "Link visits" +1 on `/invite` |
| M-29 | Same browser reopens same day | no change |
| M-30 | `REF-A` opens own link | not counted |
| M-31 | Visits shown in admin | visits never counted as sign-ups or paying |

### 3.6 B2B — partner portal

| ID | Steps | Expected |
|---|---|---|
| M-32 | `ADMIN` links partner to `PARTNER-1` by email (confirmed account) | success, audit entry |
| M-33 | Link to unconfirmed / unknown email | rejected with clear message |
| M-34 | `PARTNER-1` sidebar | "Partner portal" item → `/partner`; `USER-X` has no item and is redirected from `/partner` |
| M-35 | `/partner` content | permanent link + code + Copy, terms in plain words, sign-ups, paying clients, per-client commission, total earnings per currency; names masked, dates day-precision |
| M-36 | `PCL-1` signs up via partner link, pays Pro | client listed; commission row = amount × confirmed rate on the confirmed base |
| M-37 | Resend `invoice.paid` | no duplicate commission |
| M-38 | `PCL-2` pays, then full refund | commission reversed; total decreases |
| M-39 | `PARTNER-2` (no terms) with a paying client | "not confirmed" banner, per-client "Not calculated", no earned amount |
| M-40 | Admin confirms terms for `PARTNER-2` (review → confirm) | terms history row; only payments in effect period earn commission; no retro guessing |
| M-41 | Admin unlinks `PARTNER-1` | portal item disappears, `/partner` redirects |
| M-42 | Partner-link client who also had a user referral | partner wins (per OVR-074); not shown in the user's invitee list |

### 3.7 Admin analytics

| ID | Steps | Expected |
|---|---|---|
| M-43 | Admin → user profile `REF-A` → Referral activity | invited, registered, paid Pro/Premium, B2C credits earned, link visits — match M-07…M-20 |
| M-44 | Referral Partners list | columns sign-ups / paying / commission / terms; sort each column asc/desc |
| M-45 | Partner detail | commissions by client, terms history, linked account |
| M-46 | Admin bookings | referral-credit bookings show that payment source |
| M-47 | Regression: existing partner CRUD, referral dashboard, referred-users table | still work, numbers unchanged for old data |

### 3.8 Access / security (direct requests)

Use browser devtools or A8 script with each user's JWT.

| ID | Steps | Expected |
|---|---|---|
| M-48 | `REF-B` calls `get_my_referral_overview` | only `REF-B` data; no `REF-A` invitees |
| M-49 | `PARTNER-1` calls `get_my_referral_partner_portal` | only own partner; no other partner ids / emails / amounts |
| M-50 | Non-admin calls admin referral RPCs | `42501` |
| M-51 | Anon calls overview / portal RPCs | denied |
| M-52 | Direct `select` on ledgers, `referralAttribution`, link-click table via REST | no rows / denied |
| M-53 | Direct `insert` into `coachBooking` from client | denied |
| M-54 | Non-admin opens admin URLs (partners, user detail) | redirected / no data |

## 4. Mapping to the ticket QA checklist

| Ticket QA item | Cases |
|---|---|
| Separate item + page for user and partner | M-01, M-34 |
| Copy link, register invitee, attribution | M-03, M-07, M-08 |
| First name + last initial only | M-09 |
| One credit after Pro and Premium | M-13, M-16 |
| Re-processed payment → no second credit | M-14, M-37, A1 |
| Credits accumulate / spent on human coach, not AI | M-21…M-27, A6 |
| Partner link, signup, payment attribution, amount by confirmed terms | M-35, M-36 |
| No earnings without confirmed terms | M-39, M-40, A7 |
| No access to others' data by URL or request | M-48…M-54, A8 |
| Admin user profile analytics | M-43 |
| Partner comparison | M-44, A7 |
| Admin analytics hidden from non-admins | M-50, M-54 |
| Existing Referral Partners admin still works | M-47 |

## 5. Order and exit criteria

1. Automated: §2.1 green + A1–A7 added and green.
2. After deploy: run 7 SQL proofs in Supabase, then A8.
3. Manual: §3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 (later sections reuse data from earlier ones).
4. **Done when:** all M-cases Pass (or documented in OVR-074 as intended), no open security findings, test report updated with evidence.
5. Cleanup: remove test accounts / Stripe test customers via existing scripts; never touch live Stripe.
