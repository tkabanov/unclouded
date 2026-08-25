# Referral Program — Requirements

| | |
|---|---|
| **Status** | Requirements (target) |
| **Scope** | Admin partner management · referral codes/links · signup attribution · dashboards & stats · subscription-linked tracking · affiliate compensation readiness |
| **Audience** | Product, engineering, QA, agents |
| **Related** | Admin Panel, signup/onboarding, subscription system, user profiles |
| **Out of scope (v1)** | Commission calculation, payout processing, partner self-serve portal, automated partner payments |

**Document map**

| § | Topic |
|---|---|
| 1 | Objective |
| 2 | Actors & access |
| 3 | In scope / out of scope |
| 4 | Open decisions (confirm before implement) |
| 5 | Admin — Referral Partner Management |
| 6 | Referral code & tracking link generation |
| 7 | Attribution during sign-up |
| 8 | Attribution rules |
| 9 | User profile — referral info (admin) |
| 10 | Partner profile — referred users |
| 11 | Referral dashboard & statistics |
| 12 | Partner-level statistics |
| 13 | Subscription status tracking |
| 14 | Referral history & persistence |
| 15 | Affiliate compensation readiness |
| 16 | Admin controls checklist |
| 17 | Business rules |
| 18 | Data capture (minimum persisted fields) |
| 19 | Expected outcome |
| 20 | Suggested acceptance criteria |

---

## 1. Objective

Implement a comprehensive **Referral Program** that allows the platform to:

1. Register and manage referral partners.
2. Generate unique referral codes and tracking links.
3. Attribute new users to the correct partner.
4. Monitor resulting user activity and subscription status.

Administrators must have clear visibility into the **full referral lifecycle**: initial referral → user registration → subscription conversion → activation → cancellation → ongoing status changes.

---

## 2. Actors & access

| Actor | Who | Capabilities |
|---|---|---|
| **Platform Admin** | Internal admin (`isAdmin` / Admin Panel) | Full CRUD on partners; view dashboards; view/correct attribution; search/filter referred users |
| **Referral partner** | Coach, therapist, influencer, or other approved affiliate | Receives code/link for distribution; **no** partner self-serve UI in v1 |
| **End user (referred)** | New signup arriving via `?ref=` (or equivalent) | Attribution captured silently during signup; no required UI beyond normal signup |
| **End user (organic)** | Signup without referral | No partner assigned |

**Access rules**

- Only Platform Admins manage partners, codes, links, and attribution corrections.
- Referral UI lives under Admin Panel (dedicated **Referral Partners** section + **Referral Dashboard**).
- End users do not edit their own referral attribution.

---

## 3. In scope / out of scope

| In scope | Out of scope (v1) |
|---|---|
| Admin partner CRUD + activate/deactivate | Partner login / self-serve dashboard |
| Unique code + tracking URL per partner | Commission rate config UI |
| Signup capture + persistent attribution | Automated payouts / Stripe Connect to partners |
| Manual admin attribution correction | Multi-touch attribution graphs |
| User profile referral fields (admin) | Public marketing landing pages for partners |
| Partner referred-users list + filters | Email notifications to partners (unless later scoped) |
| Program + partner stats tied to subscription | Historical rebuild of pre-feature organic users |
| Data model ready for future commissions | Defining final commission rules |

---

## 4. Open decisions (confirm before implement)

| Topic | Default in this spec | Confirm with product |
|---|---|---|
| **Attribution model** | **Sign-up-session attribution**: code captured at start of signup journey is locked at registration completion | First-touch vs last-touch vs session — if an existing affiliate rule exists, use that |
| **Code format** | Unique human-readable slug (e.g. `PARTNER123`); system-generated; admin may set if unique | Editable codes after create? |
| **Inactive partner links** | Inactive partners: link still resolves for display/history, but **new** attributions should be rejected or flagged | Soft-fail vs hard-block signup without partner |
| **Cookie / storage TTL** | Retain `ref` through multi-step signup (session/local storage or cookie) until registration completes or TTL expires | Exact TTL if signup can span days |
| **Subscription tier labels** | Free / Pro / Premium (align with platform) | Enterprise referred users? |
| **URL shape** | `https://{platform}/signup?ref={CODE}` | Also accept other entry paths that land on signup |

---

## 5. Admin Panel — Referral Partner Management

### 5.1 Section

Add a dedicated **Referral Partners** section in the Admin Panel.

### 5.2 Admin capabilities

- Create and register referral partners.
- Edit partner information.
- Activate / deactivate referral partners.
- View partner details and referral performance.
- View all users attributed to a specific partner.

### 5.3 Partner types (examples)

- Coaches
- Therapists
- Influencers
- Other approved marketing / affiliate partners

### 5.4 Partner profile fields

| Field | Required | Notes |
|---|---|---|
| Partner name | Yes | Display name |
| Partner type / category | Yes | Enum or controlled list |
| Email address | Yes | Contact |
| Contact information | Optional | Phone, notes, social, etc. |
| Status | Yes | `Active` \| `Inactive` |
| Unique referral code | Yes | System-generated (unique) |
| Unique referral / tracking link | Yes | Derived from code + base URL |
| Date added | Yes | Created-at |
| Referral statistics | Yes | See §12 |

### 5.5 Acceptance criteria — partner management

- [ ] Admin can create a partner with required fields; duplicate code rejected.
- [ ] Admin can edit partner metadata without changing attribution history of existing users.
- [ ] Admin can deactivate a partner; historical attributions remain.
- [ ] Admin can open partner detail and see profile + stats + referred users.

---

## 6. Referral code & tracking link generation

### 6.1 Requirements

For each referral partner, the system **automatically** generates a unique referral identifier.

Each partner has:

- A **unique referral code**
- A **unique referral URL / tracking link**

**Example**

```text
https://platform.com/signup?ref=PARTNER123
```

### 6.2 Rules

- Code/link uniquely identifies the partner.
- Users arriving via the link can be attributed to that partner.
- Admins can **copy** the referral link from the partner profile for distribution.
- Duplicate referral codes are forbidden.
- Each code is associated with **only one** partner (see §17).

### 6.3 Acceptance criteria — codes/links

- [ ] Creating a partner always yields a unique code + full tracking URL.
- [ ] Copy-link control works from partner profile.
- [ ] Attempting to create/edit to a duplicate code fails with a clear error.
- [ ] Code uniqueness is enforced at the data layer (unique constraint), not only in UI.

---

## 7. Referral attribution during sign-up

### 7.1 Flow

1. User opens platform via referral link (`?ref=CODE` or equivalent).
2. System captures the referral code.
3. Referral info is **temporarily retained** through the sign-up process (survives navigation between registration steps).
4. On successful registration, user is associated with the matching referral partner.
5. Relationship is stored **permanently** in the database.

### 7.2 Edge cases

| Case | Expected |
|---|---|
| Signup without `ref` | No referral partner assigned |
| Invalid / unknown code | No partner assigned (or soft warning); do not invent a partner |
| Inactive partner code | Follow §4 decision; default: do not attribute new users |
| User abandons signup | Temporary storage may expire; no DB attribution |
| User completes signup | Permanent partner ↔ user link |

### 7.3 Acceptance criteria — signup attribution

- [ ] `ref` on signup URL is captured before credentials submit.
- [ ] Multi-step / multi-page signup does not drop the captured code.
- [ ] Completed registration persists partner association.
- [ ] Organic signup has null/empty referral fields.

---

## 8. Attribution rules

### 8.1 Default model (sign-up-session)

1. The referral source captured during the user's **sign-up journey** is assigned at registration.
2. Once a referral relationship is established, it is **not** changed automatically by later referral links.
3. Admins **may manually correct** the assigned referral partner when necessary.

### 8.2 Ambiguity prevention

If the user hits multiple referral links before completing signup, apply the **confirmed** model from §4. Until confirmed, implement:

- **Session lock**: first valid `ref` seen in the signup session wins, unless product chooses last-touch before complete.

### 8.3 Acceptance criteria — attribution rules

- [ ] Post-registration visits to other `?ref=` links do not reassign the user.
- [ ] Admin can reassign or clear referral partner on a user profile.
- [ ] Manual corrections are auditable (who/when/from→to) if audit infra exists; otherwise store `updated_at` + actor where feasible.

---

## 9. User profile — referral information (Admin)

### 9.1 Display on admin user profile

| Field | Notes |
|---|---|
| Referred by / Referral partner | Partner name (+ link to partner profile) |
| Referral code used | Code at attribution time |
| Referral date | Attribution / registration date |
| Current subscription tier | Free / Pro / Premium (platform truth) |
| Subscription status | Active / canceled / etc. |
| Relevant subscription / conversion info | e.g. first paid conversion date if available |

### 9.2 Persistence vs subscription

- Referral relationship remains visible even if subscription status later changes.
- Subscription fields are **live** (or near-live) from the subscription system; attribution fields are **historical**.

### 9.3 Acceptance criteria — user profile

- [ ] Admin user detail shows referral block when attributed.
- [ ] Organic users show empty / “Not referred”.
- [ ] Changing subscription does not clear referral fields.

---

## 10. Partner profile — Referred Users

### 10.1 Section

Each partner profile includes a **Referred Users** list.

### 10.2 List columns (minimum)

| Column | Notes |
|---|---|
| User name | |
| Email | |
| Registration date | |
| Referral date | May equal registration if attributed at signup |
| Current subscription tier | Free / Pro / Premium |
| Subscription status | Active / canceled / non-active / trial / past due / expired if platform has them |
| Subscription / conversion date | Where applicable |
| Cancellation / deactivation date | Where applicable |

### 10.3 Search & filter

Admins can search and filter the referred user list (at least: name/email search; tier; status).

### 10.4 Acceptance criteria — referred users

- [ ] List shows only users attributed to that partner.
- [ ] Search/filter updates the list correctly.
- [ ] Row links to admin user profile where applicable.

---

## 11. Referral Dashboard & statistics

### 11.1 Central dashboard

Provide a **Referral Dashboard** for the overall program.

### 11.2 Referral volume

| Metric | Definition |
|---|---|
| Total referral partners | Count of partners (optionally split active/inactive) |
| Total referred users | Users with a partner attribution |
| Total referrals generated | Same as referred users unless “referral click” is tracked separately (v1: attributed signups) |
| New referrals over selected period | Attributions (or registrations) in date range |

### 11.3 Subscription segmentation (referred users)

| Segment | Definition |
|---|---|
| Free | Referred, currently Free |
| Pro | Referred, currently Pro |
| Premium | Referred, currently Premium |

Clearly distinguish **referred but still Free** vs **converted to paid**.

### 11.4 Subscription status (referred users)

Track by current status, as supported by the platform:

- Active
- Canceled / Non-active
- Trial (if exists)
- Past due (if exists)
- Expired (if exists)

### 11.5 Acceptance criteria — dashboard

- [ ] Dashboard loads aggregate metrics without partner id filter.
- [ ] Period filter updates “new referrals”.
- [ ] Tier and status breakdowns match underlying user/subscription data.

---

## 12. Partner-level statistics

For each partner, show a performance summary:

| Metric | Definition |
|---|---|
| Total referred users | Count attributed to partner |
| Free users | Current Free among referred |
| Pro users | Current Pro among referred |
| Premium users | Current Premium among referred |
| Active users | Current active subscription/account status |
| Canceled / non-active users | Current canceled/non-active |
| Paid conversions | Referred users who reached a paid tier at least once (define: ever vs currently — prefer **ever converted** for compensation readiness, plus **currently paid** for ops) |
| Conversion rate | `paid conversions / total referred users` (document exact formula in UI tooltip) |

Stats **update automatically** when a referred user’s subscription or account status changes.

### 12.1 Acceptance criteria — partner stats

- [ ] Partner detail shows the summary metrics above.
- [ ] Upgrading a referred user Free → Pro updates Free/Pro counts and conversion metrics.
- [ ] Canceling a paid user updates Active vs Canceled without removing the user from the partner’s referred list.

---

## 13. Subscription status tracking

The referral system stays connected to the platform subscription system.

| Event | Effect on referral stats |
|---|---|
| Referred user registers | Counted as a referral |
| Remains Free | Free segment |
| Upgrades to Pro | Pro segment; paid conversion |
| Upgrades to Premium | Premium segment |
| Cancels | Status → Canceled / Non-active |
| Becomes active again | Status updated accordingly |

**Invariant:** Historical referral attribution is **never** removed when subscription changes.

---

## 14. Referral history & tracking

Persist the partner ↔ referred user relationship as durable data.

### 14.1 Minimum retained fields

| Field | Purpose |
|---|---|
| Referral partner | Who gets credit |
| Referral code | Code used |
| Referral source / link | URL or source marker |
| User registration date | When user joined |
| Referral attribution date | When link was locked |
| Subscription history / status relevant to referral | Enough for reporting (live status + conversion timestamps as available) |
| Current user status | Account/subscription status |

Admins should understand both **current state** and **history of the referral**.

---

## 15. Affiliate compensation readiness

Commission/payment processing is **out of scope**, but the data model must support future calculation of:

- Which users were referred by each partner
- Which referred users converted to paid plans
- Which subscription tier they converted to
- When the conversion occurred
- Whether the subscription is currently active or canceled
- Relevant subscription / payment status

**Design constraint:** Commission rules can be added later **without redesigning** core referral tracking.

Suggested future-ready hooks (implement as schema/events, not full payout UI):

- Immutable attribution record (`user_id`, `partner_id`, `code`, `attributed_at`)
- Conversion events or queryable first-paid timestamp per referred user
- Stable partner id that survives rename/deactivate

---

## 16. Admin controls checklist

Admins must be able to:

- [ ] Create and manage referral partners
- [ ] Generate / copy referral codes and links
- [ ] Activate / deactivate referral partners
- [ ] View partner performance
- [ ] View all users attributed to a partner
- [ ] View referral information from a user’s profile
- [ ] Manually correct referral attribution when required
- [ ] Search / filter referred users
- [ ] Monitor subscription and referral status (dashboard + partner stats)

---

## 17. Business rules

| ID | Rule |
|---|---|
| BR-01 | Each referral partner has a unique referral code/link |
| BR-02 | A referral code belongs to only one partner |
| BR-03 | Referral attribution is stored with the user after registration |
| BR-04 | Subscription changes must not remove or overwrite original referral relationship |
| BR-05 | Users without a referral source are not assigned to a partner |
| BR-06 | Referral statistics update automatically from current user/subscription data |
| BR-07 | Admins can correct referral attribution in exceptional cases |
| BR-08 | Referral data remains available for historical reporting and future affiliate compensation |
| BR-09 | Structure must allow commission rules later without redesigning core tracking |

---

## 18. Data capture (minimum persisted fields)

Agent-oriented sketch — adapt names to existing schema conventions.

### 18.1 `referral_partners` (or equivalent)

| Field | Notes |
|---|---|
| `id` | Stable PK |
| `name` | |
| `type` / `category` | |
| `email` | |
| `contact_info` | JSON or text |
| `status` | `active` \| `inactive` |
| `referral_code` | Unique |
| `tracking_url` | Stored or derived |
| `created_at` | |
| `updated_at` | |

### 18.2 User attribution (on `profiles` / join table)

| Field | Notes |
|---|---|
| `referral_partner_id` | Nullable FK |
| `referral_code` | Code used at attribution |
| `referral_source` | Optional full URL / UTM |
| `referred_at` | Attribution timestamp |
| Manual correction audit | Optional: `referral_corrected_by`, `referral_corrected_at` |

### 18.3 Stats

Prefer **derived queries** from attribution + live subscription fields over denormalized counters, unless performance requires cached aggregates that refresh on subscription webhooks/events.

---

## 19. Expected outcome

After implementation, administrators have a complete view of the referral ecosystem:

- Which partners generated referrals
- Which users came from each partner
- How those users are subscribed
- How referral performance changes over time

The implementation establishes the foundation for future affiliate commission calculation and payout management.

---

## 20. Suggested acceptance criteria (end-to-end)

- [ ] Admin creates Active partner → unique code + copyable `signup?ref=CODE` link.
- [ ] New user opens link → completes signup → appears on partner’s Referred Users with Free tier.
- [ ] Same user upgrades to Pro → dashboard/partner stats move them to Pro and count conversion; attribution unchanged.
- [ ] User cancels → status reflects Canceled; still listed under partner.
- [ ] Second `?ref=` after registration does not reassign partner.
- [ ] Admin manually reassigns partner on user profile → lists/stats update.
- [ ] Organic signup has no partner.
- [ ] Deactivated partner retains historical referred users; new attributions follow §4 decision.

---

## Implementation notes for agents

1. Read `docs/product-overrides.md` before changing signup or admin IA; if this feature contradicts Bubble/Lovable/client docs, implement per this file and append an `OVR-###` when the owner locks a deviation.
2. Reuse existing Admin Panel patterns (tabs, tables, filters) and subscription tier/status sources of truth — do not invent a parallel billing state.
3. Confirm §4 attribution model with product before coding capture/storage.
4. Prefer additive schema (nullable referral FKs) so organic users remain unchanged.
5. Commission/payout UI is explicitly deferred; do not build payment flows under this ticket.
