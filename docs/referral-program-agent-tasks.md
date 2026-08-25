# Referral Program — Agent Task Breakdown

| | |
|---|---|
| **Source** | [`docs/referral-program-requirements.md`](./referral-program-requirements.md) |
| **Status** | Ready for implementation waves |
| **Audience** | Coding agents |
| **Conflict** | [`docs/product-overrides.md`](./product-overrides.md) **OVR-021** (organic-only, no `ReferralPartner` entity) — this feature **supersedes** that deferred model; Wave 0 must lock product decisions and append a new `OVR-###` |

**How to use**

1. Complete **Wave 0** before any schema/UI work.
2. Run tasks within a wave in parallel only if their `Depends on` sets are satisfied and file ownership does not collide.
3. Each task is one agent session: implement + verify listed AC; do not expand into out-of-scope (commissions, partner portal, payouts).
4. Before touching signup or Admin IA, re-read `docs/product-overrides.md`.

---

## Dependency graph (waves)

```text
Wave 0  REF-00 (product lock + OVR)
   │
Wave 1  REF-01 (schema) ──► REF-02 (APIs/RLS)
   │                              │
Wave 2              ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                 REF-03        REF-04        REF-05
              (partner CRUD) (signup attr.) (admin user profile)
                    │             │             │
Wave 3              └──────┬──────┴──────┬──────┘
                           ▼             ▼
                        REF-06        REF-07
                   (partner referred  (dashboard +
                    users + stats)    program stats)
                           │             │
Wave 4                     └──────┬──────┘
                                  ▼
                               REF-08
                        (E2E + readiness pass)
```

---

## Wave 0 — Product lock (blocking)

### REF-00 — Confirm open decisions + override

| | |
|---|---|
| **Goal** | Lock §4 defaults and formally supersede OVR-021 for B2B partners |
| **Owner** | Product + implementing agent (doc-only) |
| **Depends on** | — |
| **Spec** | Requirements §4, §17; OVR-021 |

**Confirm (write answers into this file or product-overrides):**

| Topic | Spec default | Locked decision |
|---|---|---|
| Attribution model | Session first-touch (first valid `ref` wins) | **Locked:** first valid `ref` in signup session wins; post-registration `?ref=` never reassigns |
| Code format | System-generated unique slug; admin may set if unique | **Locked:** `^[A-HJ-NP-Z2-9]{4,16}$`; system-generated on create; admin may set if unique |
| Editable codes after create? | Spec open | **Locked:** yes, if unique vs other partners and vs `profiles.referralCode` |
| Inactive partner | No **new** attribution; history kept | **Locked:** no new attribution; history kept |
| Soft-fail vs hard-block signup | Soft-fail (signup proceeds, no partner) | **Locked:** soft-fail |
| Cookie/storage TTL | Survive multi-step signup | **Locked:** `sessionStorage` key `uncloud360.pendingReferralCode` (tab session); no multi-day cookie |
| URL shape | `/signup?ref={CODE}` (+ other paths that land on signup) | **Locked:** `/signup?ref={CODE}` |
| Coexistence with organic user-to-user referrals (OVR-021) | Spec is partner-centric; organic share cards exist today | **Locked:** both channels — partner lookup first (active only), else organic user code; see OVR-058 |

**Deliverables**

- [x] §4 answers recorded (table above or linked note).
- [x] New `OVR-058` appended: Admin **Referral Partners** entity + dashboards in scope; commission/portal still deferred; clarify relationship to organic `profiles.referralCode` / `referredByUserId`.
- [x] Agents may proceed to Wave 1.

**Out of scope:** Any code changes.

---

## Wave 1 — Data foundation

### REF-01 — Schema & migrations

| | |
|---|---|
| **Goal** | Additive DB model for partners + user attribution (compensation-ready) |
| **Depends on** | REF-00 |
| **Spec** | §15, §17 BR-01…09, §18 |
| **Likely touch** | `supabase/migrations/*`, existing `profiles` columns if extending |

**Implement**

- Table `referral_partners` (or project naming convention): `id`, `name`, `type`/`category`, `email`, `contact_info`, `status` (`active`\|`inactive`), `referral_code` (**unique**), `tracking_url` (stored or derived), `created_at`, `updated_at`.
- User attribution (nullable FK on `profiles` **or** join table): `referral_partner_id`, `referral_code`, `referral_source`, `referred_at`; optional correction audit (`referral_corrected_by`, `referral_corrected_at`).
- Unique constraint on partner `referral_code` at DB layer.
- Prefer derived stats over denormalized counters.
- Preserve organic referral fields if coexistence was locked in REF-00 (do not break share-card attribution).

**Acceptance**

- [ ] Migration applies cleanly; unique code enforced.
- [ ] Organic users remain with null partner FK.
- [ ] Immutable attribution fields support future commissions without redesign (§15).
- [ ] Deactivate partner does not cascade-delete attributions (BR-04).

**Out of scope:** UI, commission tables, payouts.

---

### REF-02 — Server APIs, RLS, code/link helpers

| | |
|---|---|
| **Goal** | Admin-only partner CRUD + attribution read/write helpers; link generation |
| **Depends on** | REF-01 |
| **Spec** | §2, §5, §6, §8.3 (manual correction) |
| **Likely touch** | `supabase/functions/*` and/or `frontend/src/lib/settings/admin/*`, RLS policies |

**Implement**

- Admin-gated CRUD for partners (create/edit/activate/deactivate).
- Auto-generate unique code + tracking URL (`https://{platform}/signup?ref={CODE}` per locked URL shape).
- Reject duplicate codes with clear error.
- Admin attribution correction API (reassign/clear partner on user) with audit fields where feasible.
- Resolve `ref` → partner for signup (active vs inactive per REF-00).
- Reuse subscription tier/status **sources of truth** — no parallel billing state.

**Acceptance**

- [ ] Non-admin cannot mutate partners/attribution.
- [ ] Create always yields unique code + full URL; copy-ready string.
- [ ] Duplicate code fails at API + DB.
- [ ] Inactive partner: new attributions follow locked §4 rule.
- [ ] Manual correction persists who/when/from→to when possible.

**Out of scope:** Admin UI screens (Wave 2–3).

---

## Wave 2 — Capture + Admin partner surfaces

### REF-03 — Admin: Referral Partners CRUD UI

| | |
|---|---|
| **Goal** | Dedicated **Referral Partners** section in Admin Panel |
| **Depends on** | REF-02 |
| **Spec** | §5, §6, §16 |
| **Likely touch** | Admin settings/shell routes, new partner list/detail components; reuse existing admin table/filter patterns |

**Implement**

- Section: list partners; create; edit metadata; activate/deactivate.
- Partner fields per §5.4 (name, type, email, contact, status, code, link, date added).
- Partner types: coaches, therapists, influencers, other (controlled list).
- Copy referral link control on partner profile.
- Detail shell ready for stats + referred users (can stub until REF-06).

**Acceptance**

- [ ] Admin can create partner with required fields; duplicate code rejected in UI.
- [ ] Edit metadata does not rewrite historical user attributions.
- [ ] Deactivate keeps historical attributions.
- [ ] Copy-link works from partner profile.
- [ ] Matches Admin Panel IA patterns; append OVR only if IA contradicts Bubble/client docs beyond REF-00 override.

**Out of scope:** Dashboard aggregates (REF-07); referred-users table filters (REF-06).

---

### REF-04 — Signup attribution capture

| | |
|---|---|
| **Goal** | Capture `?ref=` through signup; persist partner on successful registration |
| **Depends on** | REF-02 |
| **Spec** | §7, §8, BR-03/05 |
| **Likely touch** | `SignupPopup` / onboarding signup, `referralAttribution.ts` (extend carefully vs organic), session/local/cookie storage |

**Implement**

- Capture `ref` early in signup journey; retain across steps until registration completes or TTL expires.
- On success: associate user ↔ partner permanently.
- Edge cases: no `ref` → no partner; invalid code → no partner; inactive → per REF-00; abandon → no DB row.
- Post-registration `?ref=` must **not** reassign (BR / §8.1).
- Ambiguity: session lock per REF-00 (default first valid `ref`).

**Acceptance**

- [ ] `ref` captured before credentials submit.
- [ ] Multi-step signup does not drop code.
- [ ] Completed registration persists partner association.
- [ ] Organic signup: null/empty partner fields.
- [ ] Later `?ref=` visits do not reassign.

**Out of scope:** Marketing landing pages; partner-facing UI.

---

### REF-05 — Admin user profile: referral block

| | |
|---|---|
| **Goal** | Show referral + live subscription context on admin user detail; allow manual correction |
| **Depends on** | REF-02 |
| **Spec** | §9, §8.3, §16 |
| **Likely touch** | Admin user profile components |

**Implement**

- Display: referred by (name + link to partner), code used, referral date, current tier, subscription status, conversion info if available.
- Organic: empty / “Not referred”.
- Admin reassign/clear partner; lists/stats consumers must see updates (full consistency verified in REF-08).
- Subscription changes must not clear attribution fields.

**Acceptance**

- [ ] Attributed users show referral block; organic shows empty state.
- [ ] Changing subscription does not clear referral fields.
- [ ] Admin can reassign/clear partner.

**Out of scope:** Partner referred-users list UI (REF-06).

---

## Wave 3 — Lists, stats, dashboard

### REF-06 — Partner profile: referred users + partner stats

| | |
|---|---|
| **Goal** | Per-partner referred users table + performance summary |
| **Depends on** | REF-03, REF-04, REF-05 |
| **Spec** | §10, §12, §13 |
| **Likely touch** | Partner detail page; queries joining attribution + subscription |

**Implement**

- Referred Users columns: name, email, registration date, referral date, tier, status, conversion date, cancellation date (where platform supports).
- Search/filter: name/email, tier, status.
- Row → admin user profile.
- Partner stats: total referred; Free/Pro/Premium; active; canceled/non-active; paid conversions (**ever** preferred + currently paid if useful); conversion rate with UI tooltip formula.
- Stats update when subscription/account status changes (derived queries / existing subscription events).

**Acceptance**

- [ ] List only users attributed to that partner.
- [ ] Search/filter correct; row links work.
- [ ] Free→Pro updates Free/Pro + conversion metrics; attribution unchanged.
- [ ] Cancel updates Active vs Canceled; user remains on list.

**Out of scope:** Program-wide dashboard (REF-07).

---

### REF-07 — Referral Dashboard (program-level)

| | |
|---|---|
| **Goal** | Central Admin **Referral Dashboard** |
| **Depends on** | REF-03, REF-04 (data); ideally REF-06 for shared metric helpers |
| **Spec** | §11, §13, §16 |
| **Likely touch** | New admin dashboard view; shared metric helpers with REF-06 |

**Implement**

- Metrics: total partners (optionally active/inactive split); total referred users; referrals generated (= attributed signups in v1); new referrals in selected period.
- Segmentation: Free / Pro / Premium among referred; distinguish referred-but-Free vs converted-to-paid.
- Status breakdown: Active, Canceled/Non-active, Trial/Past due/Expired if platform has them.
- Period filter for “new referrals”.
- Reuse same subscription truth as REF-06.

**Acceptance**

- [ ] Aggregates load without partner id filter.
- [ ] Period filter updates new referrals.
- [ ] Tier/status breakdowns match underlying data.

**Out of scope:** Partner self-serve; click/impression tracking beyond attributed signups.

---

## Wave 4 — Verification & readiness

### REF-08 — End-to-end acceptance + compensation readiness check

| | |
|---|---|
| **Goal** | Prove §20 E2E paths; confirm §15 data hooks without building payouts |
| **Depends on** | REF-06, REF-07 |
| **Spec** | §15, §16, §19, §20 |

**Verify (manual and/or automated)**

- [ ] Admin creates Active partner → unique code + copyable `signup?ref=CODE`.
- [ ] User via link → signup → appears on partner Referred Users as Free.
- [ ] Upgrade to Pro → dashboard/partner stats move to Pro + conversion; attribution unchanged.
- [ ] Cancel → Canceled status; still listed under partner.
- [ ] Second `?ref=` after registration does not reassign.
- [ ] Admin manual reassign → lists/stats update.
- [ ] Organic signup has no partner.
- [ ] Deactivated partner: history retained; new attributions follow REF-00.
- [ ] Schema has immutable attribution + queryable first-paid / conversion signals; **no** commission UI or Stripe Connect to partners.

**Deliverables**

- Short test notes or checklist results (pass/fail) linked from this file or PR description.
- Gaps filed as follow-ups — do not silently expand scope into payouts.

---

## Parallelism cheat sheet

| Wave | Can run in parallel | Shared caution |
|---|---|---|
| 0 | — | Blocking |
| 1 | REF-01 then REF-02 (sequential) | Migrations first |
| 2 | REF-03 ‖ REF-04 ‖ REF-05 | Avoid editing same signup + admin files without coordination; attribution helper is shared |
| 3 | REF-06 ‖ REF-07 if metric helpers extracted first; else REF-06 → REF-07 | Prefer one agent owns shared query helpers |
| 4 | REF-08 alone | — |

---

## Explicit non-goals (all agents)

Do **not** build in v1:

- Partner login / self-serve portal
- Commission rate config UI or automated payouts
- Stripe Connect to partners
- Multi-touch attribution graphs
- Public marketing landing pages for partners
- Partner email notifications (unless separately scoped)
- Historical rebuild of pre-feature organic users
- Final commission rule definitions

---

## Traceability (requirements § → tasks)

| Requirements | Tasks |
|---|---|
| §4 Open decisions | REF-00 |
| §5 Partner management | REF-01, REF-02, REF-03 |
| §6 Codes & links | REF-01, REF-02, REF-03 |
| §7–8 Attribution | REF-02, REF-04, REF-05 |
| §9 User profile (admin) | REF-05 |
| §10 Referred users | REF-06 |
| §11 Dashboard | REF-07 |
| §12 Partner stats | REF-06 |
| §13 Subscription tracking | REF-06, REF-07 |
| §14 History & persistence | REF-01, REF-08 |
| §15 Compensation readiness | REF-01, REF-08 |
| §16 Admin checklist | REF-03…REF-07 |
| §17 Business rules | All (assert in REF-08) |
| §18 Data capture | REF-01 |
| §19–20 Outcome / E2E AC | REF-08 |

---

## Agent prompt template (copy per task)

```text
Implement task {REF-XX} from docs/referral-program-agent-tasks.md.
Source of truth: docs/referral-program-requirements.md.
Read docs/product-overrides.md first (esp. referral OVR entries from REF-00).
Respect Depends on / Out of scope. Reuse Admin Panel and subscription sources of truth.
Do not build commissions, partner portal, or payouts.
Verify the task Acceptance checklist before finishing.
```
