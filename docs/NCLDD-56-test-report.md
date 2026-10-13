# NCLDD-56 — B2C referral rewards and B2B partner portal: test report

**Date:** 2026-10-13 · **Build:** `main` (NCLDD-56 commits up to the link-visits change) · **Spec:** YouTrack NCLDD-56, `docs/product-overrides.md` OVR-074 · **Status:** code complete, **not deployed** — migrations await PM review.

## Summary

All six slices are on `main` (`d8f475d`, `b121c58`, `6709907`, `4c61dc1`, `6fe7bc6`, `4e84749`). Automated gates and all SQL proofs pass on a local Postgres (PGlite) harness. Nothing has been applied to the linked Supabase project, so no live / browser QA has been run yet — see [Live QA checklist](#live-qa-checklist-after-deploy).

## Automated results

| Check | Result |
|---|---|
| `npm run lint` | 0 errors (32 pre-existing warnings) |
| `npm run test` | 1155 / 1155 |
| `npm run build` | pass |
| `npx tsc --noEmit -p tsconfig.app.json` | 182 errors — all pre-existing (same count before NCLDD-56), none in NCLDD-56 files |
| `supabase/functions/_shared/referralPayments.test.ts` | 10 / 10 (runs in vitest) |

SQL proofs (each a single transaction ending in `ROLLBACK`, run on PGlite with a Supabase-like stub schema + the real `20260825200000_referral_partners.sql`): all **ALL PASS**.

| Proof | Covers |
|---|---|
| `supabase/tests/referral_attribution_protection_proof.sql` | attribution read-only, permanent code, partner/user code collisions, delete + recreate restore, FK cascades, admin RPC, self-referral, registry isolation |
| `supabase/tests/referral_rewards_ledgers_proof.sql` | one credit per referred user, redelivery idempotency, terms (lifetime / months / first payment, effective dates, history), refunds / disputes (proportional, stale snapshots, won dispute, spent credit), partner-wins, pre-program payers, isolation |
| `supabase/tests/one_on_one_referral_credit_proof.sql` | booking with referral credit on Free / before Premium credits, cancel 24h+ / late, forged booking INSERT denied, no credit laundering after dispute |
| `supabase/tests/referral_overview_proof.sql` | own data only, masked names (Unicode spaces, email-like names), partner-moved invitees hidden, anon denied |
| `supabase/tests/referral_partner_portal_proof.sql` | admin-only linking (confirmed email, audit), own partner only, net earnings, no earnings without terms, unlink, no emails / ids / amounts |
| `supabase/tests/referral_admin_analytics_proof.sql` | admin-only analytics, user stats, partner comparison, partner program, bookings payment source |
| `supabase/tests/referral_link_clicks_proof.sql` | anonymous link visits: dedupe per browser/day, unknown / inactive / own codes ignored, daily cap, counters for user / partner / admin, table not readable |

Reviews: security review per slice (all blocking findings fixed, re-reviewed), fidelity review of the whole ticket against the DoD (must-fixes applied in slice 6).

## Deploy checklist

1. PM review, then run the read-only pre-checks in the headers of `20261013150000` and `20261013160000` (each must return 0).
2. Apply in order: `20261013150000` → `160000` → `170000` → `180000` → `190000` → `200000`.
3. Run the seven proofs above in the SQL editor (expect `… ALL PASS`).
4. Regenerate `frontend/src/integrations/supabase/types.ts` (UTF-8, see T-021), re-run typecheck.
5. Deploy `stripe-webhook` right after the migrations (a webhook deployed before them fails every `invoice.paid`), and `generate-kota-read` (it selects `coachBooking.paymentSource`).
6. Stripe endpoint (test + live): enable `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
7. Deploy the frontend.

## Live QA checklist (after deploy)

Mapped to the ticket's QA checklist. Not run yet.

- [ ] "Invite a friend" in the user sidebar → `/invite`; "Partner portal" only for a linked partner account → `/partner` (others redirected).
- [ ] Copy the user link, sign up a test invitee, confirm attribution (invitee listed as "First L.", status changes after email confirmation).
- [ ] Pay Pro (Stripe test) as the invitee → referrer gets exactly one credit; resend the `invoice.paid` event → no second credit. Repeat with Premium for another invitee.
- [ ] Book a 1:1 coach session with the referral credit on a Free account (Kota's Read is generated for the coach); cancel 24h+ → credit returns; credit is never offered for AI sessions.
- [ ] Open the referral link in a fresh browser → "link visits" grows by 1 (once per day); the owner's own visit doesn't count.
- [ ] Admin links a partner to a confirmed account; partner link signup + paid invoice → commission row; with terms confirmed the portal shows the amount, without terms it shows "not confirmed" / "Not calculated".
- [ ] Full refund in Stripe → commission reversed, B2C credit removed if unused.
- [ ] Direct requests: another user / partner gets only their own data (`get_my_referral_overview`, `get_my_referral_partner_portal`); admin RPCs return 42501 for non-admins.
- [ ] Admin user profile → Referral activity numbers; Referral Partners list sorting by sign-ups / paying / commission; existing partner CRUD, dashboard and referred-users table still work.
