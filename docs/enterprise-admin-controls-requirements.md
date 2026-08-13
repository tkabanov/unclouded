# Enterprise Requirements — Platform Admin, Manager Portal & Employee Experience

| | |
|---|---|
| **Status** | Requirements (target) |
| **Scope** | Part A — Platform Admin · Part B — Organization Manager / HR portal · Part C — Enterprise employee end-user experience |
| **Audience** | Product, engineering, QA |
| **Related** | Phase 2 §9, US-205–208 / US-505, `docs/Admin Account Set-Up.md`, OVR-022 / OVR-023 / OVR-024 / OVR-025 / OVR-038 / OVR-048 / OVR-051 / OVR-053 / OVR-054 / OVR-055 / OVR-056 |
| **Out of scope** | Pure individual (non-enterprise) billing UX except where enterprise must hide or bypass it; Platform Admin org commercial invoicing details beyond what employees need for entitlement |

**Document map**

| Part | Topic |
|---|---|
| **A** (§§1–11) | Internal Admin Controls — org setup, billing models, seats, enrollment codes/URLs, employee visibility |
| **B** (§§12–22) | Enterprise Organization Manager Portal — access/privacy, seats & invites, anonymized analytics |
| **C** (§§23–32) | Enterprise Employee Experience — onboarding, seat validation, entitlement, hide paywall, full tier access |

---

# Part A — Internal Admin Controls (Unclouded Platform Admin)

## 1. Goal

Internal Unclouded Admins (platform operators) must have full control to:

1. Create and configure enterprise organizations (workplaces).
2. Provision seats and enrollment access (codes + onboarding URLs).
3. Configure custom billing / pricing models and payment terms.
4. Override seats, contract dates, and account active state.
5. Inspect every employee user record linked to an enterprise account.

Enterprise employees must never be billed individually; entitlement comes from the organization contract tier (Pro or Premium). Admin controls are the source of truth for that contract.

---

## 2. Actors & access

| Actor | Who | Capabilities in this section |
|---|---|---|
| **Platform Admin** | Unclouded internal admin (`isAdmin` / admin console access) | Full CRUD on organizations, billing metadata, seats, codes, URLs, employee visibility |
| **Organization Manager / HR** | External client admin | **Not** in scope in Part A — see Part B |
| **Enterprise employee** | End user | Consumes enrollment code / join URL; no admin UI |

**Access rules**

- Only Platform Admins may create/edit/deactivate organizations and change billing, seats, contract dates, and enrollment codes at the platform level.
- All admin organization UI lives under the Admin console Organizations area (`/admin/organizations`, OVR-048).
- Mutations must be audited (who changed what, when) at least for: seat count, billing model, price, payment term, contract end date, `isActive`, enrollment code create/deactivate.

---

## 3. Organization Creation & Configuration

### 3.1 Create organization form

Platform Admin can create an enterprise organization from Admin → Organizations → **Add organization**.

#### Required fields on create

| Field | Type | Rules | Notes |
|---|---|---|---|
| **Organization name** | Text | Required, trimmed, unique enough for ops (display name; soft uniqueness recommended) | Shown in lists and HR portal |
| **Manager / primary contact email** | Email | Required, valid email | Primary org contact. Product language in UI may say “HR contact email” (OVR-053). Key contact for portal access. **Does not** auto-enroll clinically (OVR-055 supersedes OVR-025). |
| **Contract tier** | Enum | Required: `pro` \| `premium` | Copied onto enrolled employees as `enterpriseTier` |
| **Billing model** | Enum | Required: see §4 | Determines seat semantics |
| **Seat count / target seats** | Integer ≥ 1 | Required | Meaning depends on billing model (§4) |
| **Payment term** | Enum | Required: see §4.3 | |
| **Contract start date** | Date | Required | Inclusive |
| **Contract end date** | Date | Required, ≥ start | After end date, new enrollments must be rejected while org remains historically visible |
| **Active** | Boolean | Default `true` | Soft kill switch for the whole enterprise account |

#### Optional fields on create

| Field | Type | Rules |
|---|---|---|
| **Price** | Decimal ≥ 0 | Contract commercial amount (currency assumed USD unless later localized). Display + reconciliation metadata. |
| **Billing notes** | Long text | Free-form (PO number, invoice refs, Stripe customer id, manual invoice links) |
| **Payment method** | Enum | `stripe` \| `manual_invoice` — how invoices are collected (§4.3) |

#### Acceptance criteria — create

- [ ] Admin can create an org with all required fields; invalid email / missing name / end &lt; start are blocked with clear errors.
- [ ] On success, org appears in Organizations list with name, tier, seats utilization, end date, active state.
- [ ] Creating an org does **not** charge Stripe for individual seats; it only stores contract configuration.
- [x] If contact email matches an existing profile, that profile gains **portal access** when they sign in (OVR-055); clinical enrollment is **not** automatic — use members panel for dual-mode.

### 3.2 Contract tier

| Value | Effect on enrolled employees |
|---|---|
| **Pro** | Effective entitlement = Pro (paths, chat, group session rules as for individual Pro) |
| **Premium** | Effective entitlement = Premium (including Premium-only paths / coaching credits rules as for individual Premium) |

#### Acceptance criteria — tier

- [ ] Tier is selectable only as Pro or Premium (no Free, no custom third tier in v1).
- [ ] Changing org tier updates the contract source of truth; enrolled employees’ effective access follows org `contractTier` / synced `enterpriseTier` (define sync: either live read from org or batch update on save — must be documented in implementation).
- [ ] Individual Stripe subscription state is ignored for `accountType = enterprise`.

### 3.3 Enrollment code

Each organization must have at least one usable way for employees to enroll.

#### Code rules

| Rule | Spec |
|---|---|
| **Length** | **6–8 characters** in the public-facing “short code” format (example: `ACME2026` or `ACME-26`). Hyphen may be allowed in display but must not break uniqueness/normalization. |
| **Uniqueness** | Globally unique among **active** enrollment codes |
| **Charset** | Uppercase letters and digits; optional single hyphen; no ambiguous punctuation beyond that |
| **Generation** | Admin can **auto-generate** a unique code or **assign** a custom code that passes validation |
| **Lifecycle** | Codes can be created, copied, and **deactivated** (soft revoke). Deactivated codes cannot enroll new users. Historical redemptions remain linked. |
| **Multi-code** | An org may have multiple codes (e.g. rotate after leak); at least one active code is required while org is active and accepting enrollments |

#### Acceptance criteria — enrollment code

- [ ] On org create (or immediately after), Admin can generate or assign a code meeting 6–8 character rules.
- [ ] Duplicate active codes are rejected.
- [ ] Custom codes that fail length/charset validation are rejected with explicit messaging.
- [ ] Admin can copy the code to clipboard from org detail.
- [ ] Deactivating a code immediately blocks new redemptions; existing members stay enrolled until revoked separately.

### 3.4 Unique onboarding URL

In addition to the enrollment code, each **active enrollment code** (or each organization — pick one model and stick to it) must expose a **unique onboarding URL**.

#### URL requirements

| Item | Spec |
|---|---|
| **Format** | Absolute URL under the app origin, e.g. `https://{app-host}/join/{enrollmentCode}` or `/join/{token}` |
| **Behavior** | Opens registration / onboarding with the code pre-applied (or locked), so the employee does not need to type the code |
| **Validation** | Same seat, active-org, and code-active checks as manual code entry |
| **Copy** | Admin UI shows the URL and a one-click **Copy join link** action |
| **Security** | URL is unguessable only insofar as the code is; treat code secrecy as the control. Rate-limit redemption attempts. |

#### Acceptance criteria — onboarding URL

- [ ] Org detail shows at least one copyable onboarding URL tied to an active code.
- [ ] Opening the URL as a logged-out user starts signup with enterprise enrollment context.
- [ ] Opening the URL with an inactive code or inactive org shows a clear failure (no silent fallback to individual free signup without messaging).
- [ ] Seat-full state is communicated before account creation completes linkage (or linkage fails cleanly with seats-full).

### 3.5 Edit organization

Admin can edit all configuration fields from org detail / Edit organization:

- Name, contact email, tier, billing model, seats/target, payment term, payment method, price, notes, contract dates, active flag.
- Changing contact email updates primary HR portal linkage (OVR-055); clinical enrollment is opt-in via members panel.

---

## 4. Billing & Pricing Models

Admin must configure how the enterprise contract is priced and how seats are interpreted.

### 4.1 Model A — Flat Rate / Fixed Seats

**Definition:** Customer pre-purchases a fixed seat quota (e.g. 100 seats). Enrollment is hard-capped at `seat_count`.

| Aspect | Behavior |
|---|---|
| **Seat count** | Purchased quota (hard limit) |
| **Active seats** | Count of currently enrolled / entitled employees linked to the org |
| **Enrollment** | Rejected when `active_seats >= seat_count` |
| **Billing reconciliation** | Invoice based on contracted seat quota × price / payment term — **not** on monthly active usage |
| **Admin display** | `active_seats / seat_count` (e.g. `87 / 100`) |
| **US-207** | Flat-rate orgs show fixed seats |

#### Acceptance criteria — flat rate

- [x] Billing model `flat_rate` (or equivalent) is selectable on create/edit.
- [x] Enrollment and invite acceptance enforce the hard cap.
- [x] Lowering `seat_count` below current `active_seats` is either blocked or requires explicit Admin confirmation (choose one; default: **block** with message to revoke members first). *(Blocked in Admin client + DB `workplace_seat_floor_guard` BEFORE UPDATE.)*
- [x] Raising `seat_count` immediately allows new enrollments up to the new cap.

### 4.2 Model B — Pay per Active User

**Definition:** Dynamic / variable usage model. Contract defines a **target seat threshold** (forecast / soft commercial target), while billable quantity is driven by **active users in a billing period**.

| Aspect | Behavior |
|---|---|
| **Target seats** | Stored as `seat_count` (or dedicated `target_seat_threshold`) — used for capacity planning and soft warnings, not necessarily a hard enroll cap |
| **Active user (billing)** | User linked to the org who meets the “active” definition for the period (see below) |
| **Enrollment cap** | Soft target + optional hard `max_seats` override (OVR-054). Target alone never blocks; Admin UI warns when enrolled exceeds target. |
| **Admin display** | Target seats + current period active users + enrolled headcount |
| **US-207** | Usage-based orgs show active seats tracked monthly |
| **US-208** | Admin can run/export monthly active-users-per-org report for manual invoice reconciliation |

#### Active user definition (billing period)

For a selected **UTC calendar month**, an enrolled enterprise member counts as **active** if they have **at least one** of these events in the period:

- `chatConversation` created, **or**
- `pathSessionCompletion` created, **or**
- `journalEntry` created, **or**
- `assessmentResult` created, **or**
- `dailyCheckin` created

This set is normative (OVR-054). Auth login / session alone does **not** count. Same definition feeds US-208 reports (`admin_workplace_monthly_active_users` / `count_workplace_period_active_users`).

#### Acceptance criteria — pay per active

- [x] Billing model `pay_per_active` is selectable.
- [x] Admin sees enrolled count, target threshold, and current-period active count.
- [x] Monthly report lists per-org active user counts for a chosen month and supports export (CSV at minimum).
- [x] Report is suitable for manual invoice reconciliation (org name, billing model, period, active count, target seats, contracted price/term).

### 4.3 Payment terms & collection

#### Payment term options

| Term | Meaning |
|---|---|
| **Annual (upfront)** | One invoice / charge per contract year |
| **Quarterly** | Four periods per year |
| **Monthly** | Monthly recurring |

(Existing product metadata also has **Half-yearly** — retained as a fourth term in Admin UI.)

#### Payment collection modes

| Mode | Behavior |
|---|---|
| **Manual invoice tracking** | Admin stores price, term, notes / external invoice references. No automated Stripe charge for the org contract. Status fields: e.g. `draft` / `sent` / `paid` / `overdue` (minimum viable: notes + paid flag or status enum). |
| **Stripe integration** | **Phase 2.** Today: `paymentMethod = stripe` is metadata only (label + notes for external Stripe customer/invoice refs). No org-level Stripe Customer/Invoice/Subscription or webhooks yet. Individual employee Stripe checkout remains disabled for enterprise users. |

#### Acceptance criteria — payment terms

- [x] Admin can set Annual / Quarterly / Monthly (and Half-yearly if retained).
- [x] Admin can choose Manual vs Stripe collection mode.
- [x] For **manual**: price + term + notes/status are visible on org detail; no requirement that Stripe fires.
- [ ] For **Stripe**: implementation must define which Stripe object is used, webhook handling for paid/failed, and display of payment status on org detail. Until Stripe org billing ships, Manual mode must remain fully usable — **Manual is fully usable; Stripe mode is metadata-only (phase 2 / OVR-054).**
- [x] Payment term changes do not silently alter employee entitlements.

### 4.4 What billing must **not** do

- Must not create per-employee Stripe subscriptions when `accountType = enterprise`. *(Enforced — shipped.)*
- Must not show employee-facing upgrade CTAs as a consequence of org billing config (employee UX is Part C; Admin must not break that invariant). *(Enforced — shipped.)*
- Deactivating billing collection must not auto-wipe historical enrollment records. *(Enforced — shipped.)*

---

## 5. Seat & Account Overrides

Platform Admin needs operational overrides without waiting for a new contract cycle.

### 5.1 Adjust seat count / target

- Admin can increase or decrease `seat_count` (flat quota or pay-per-active target / max).
- Change takes effect immediately for enrollment gating rules of the selected billing model.
- UI shows before/after utilization: `active_seats / seat_count`.

### 5.2 Extend (or shorten) contract end date

- Admin can edit `contract_end_date`.
- While `now > contract_end_date` **or** `is_active = false`, **new** enrollments and code redemptions fail.
- Existing members: product default — retain access until Admin deactivates org or revokes members (document if access is cut at end date automatically; **recommendation:** end date blocks new enrollment; optional scheduled deactivation job is a follow-up).

### 5.3 Activate / deactivate enterprise account

| `is_active` | Effect |
|---|---|
| `true` | Org usable; codes redeemable (if code active, seats allow, within dates) |
| `false` | Codes and invites cannot enroll; org remains visible to Admin; HR portal should reflect inactive state |

#### Acceptance criteria — overrides

- [x] Seat count, end date, and active flag are editable from Admin org edit.
- [x] Deactivated org cannot accept new enrollments.
- [x] Reactivating restores enrollment subject to seats and dates.
- [x] Overrides are available without deleting/recreating the org.

### 5.4 Member-level overrides (Admin)

From org detail, Admin can:

- View roster of linked employees.
- Add existing users by email / invite new users (aligned with OVR-022).
- Revoke membership (frees a seat for flat-rate).
- Assign/remove delegated HR / Manager roles (roster roles; primary contact remains contact email).

---

## 6. Visibility into employee user records

Admin must have **full visibility** into individual employee records linked to the enterprise account (this is **Admin-only** — not HR).

### 6.1 Organization → employees

- Org detail lists all profiles with `workplaceId = org` (and/or active workplace membership).
- Columns at minimum: name, email, effective tier, roles (HR/Manager if any), enrollment date, account active/deactivated status.
- Click-through to full Admin user detail (`/admin/users/:id`).

### 6.2 Full user detail (linked employees)

Same depth as general Admin user management, including as applicable:

- Profile / settings fields
- Paths and sessions
- Assessment / reassessment results
- Classification / fingerprint-related operational flags (per existing Admin policy)
- Journaling / chat / session activity indicators
- Crisis / grief / recovery flags if exposed to Admin elsewhere
- Bookings / credits where relevant to Premium

### 6.3 Privacy boundary reminder

| Viewer | Individual clinical / chat / assessment data |
|---|---|
| Platform Admin | Allowed (this section) |
| Org Manager / HR | **Forbidden** (Part B) |

#### Acceptance criteria — visibility

- [x] Org detail embeds or links a complete filtered users table for that workplace.
- [x] Deep link opens the standard Admin user detail for that employee.
- [x] Users not linked to the org do not appear in the org-filtered list.
- [x] Seat utilization counts stay consistent with the roster definition of “active seat”.

---

## 7. Admin UI inventory (target)

| Screen | Purpose |
|---|---|
| **Organizations list** | Search/filter orgs; columns: name, tier, billing model, `active/seat`, end date, active, payment term |
| **Add / Edit organization** | All fields in §3–§4 |
| **Organization detail** | Summary + billing + seats + codes/URLs + members + link to users table |
| **Enrollment codes panel** | Generate, assign, copy code, copy join URL, deactivate |
| **Billing / usage report** | Month picker, per-org active users, export (US-208) |
| **User detail** | Existing Admin user page, reachable from org roster |

---

## 8. Open questions (decide before build)

1. **Pay-per-active hard cap:** **Decided (OVR-054):** soft target + optional hard `maxSeats`; Admin warns when enrolled &gt; target.
2. **Contract end date:** Auto-revoke employee entitlement at midnight end date, or only freeze new enrollments? **(Shipped: freeze new enrollments only.)**
3. **Tier change mid-contract:** Immediate entitlement flip for all members, or effective next period? **(Shipped: immediate.)**
4. **Stripe org billing:** **Decided:** Manual first; Stripe org collection is phase 2 (metadata-only today).
5. **Onboarding URL granularity:** One URL per org vs one URL per enrollment code? **(Shipped: one URL per enrollment code `/join/{code}`.)**
6. **Contact field naming:** Keep UI label “HR contact email” (OVR-053) while this spec says “manager email”, or rename UI to “Manager / HR contact email”? **(Keep HR contact email — OVR-053.)**
7. **Half-yearly term:** Keep, or collapse to Annual / Quarterly / Monthly only? **(Kept.)**

---

## 9. Traceability

| Requirement cluster | User stories / docs |
|---|---|
| Org CRUD, seats, billing visibility | US-505, Admin Account Set-Up — Enterprise users |
| Enrollment codes | US-206 |
| Seat utilization by model | US-207 |
| Monthly active users report | US-208 |
| Admin console placement | OVR-048 |
| Roster / roles | OVR-022 |
| Primary contact auto-enroll | OVR-025 |
| Billing period + price metadata (current) | OVR-053 — extended by §4 / OVR-054 (`billingModel`, payment method, invoice status, usage report) |

---

## 10. Current implementation snapshot (baseline, not the target)

Use this only to estimate gaps against §§3–6. The normative requirements are §§1–7.

| Area | Today (approx.) | Gap vs this doc |
|---|---|---|
| Create/edit org, tier Pro/Premium, seats, dates, active | Implemented (`AddWorkplacePopup`, `workplace` table) | — |
| Contact email | `contactEmail` (HR), no separate manager-email column (OVR-053) | Naming / dual-contact if product insists on distinct manager email |
| Enrollment codes | Implemented (OVR-054): 6–8 chars, multi-active, generate/assign/deactivate; auto-mint on org create | — |
| Unique onboarding URL | Implemented: `/join/{code}` + peek validation + Copy join link in Admin/Employer panel (OVR-054) | — |
| Billing model flat vs pay-per-active | Implemented (`billingModel`, hard cap via `workplace_hard_seat_limit`; optional `maxSeats`; DB seat-floor guard; over-target soft warning) | Stripe org collection still metadata-only (phase 2) |
| Payment terms | Metadata monthly/quarterly/half_yearly/yearly + price + paymentMethod / invoiceStatus (OVR-053 / OVR-054) | Stripe org path still phase 2 |
| Seat/date/active overrides | Implemented; end date / inactive block **new** enrollments only; lowering seats/maxSeats below enrolled blocked in client + DB | — |
| Employee visibility from org | Implemented (`AdminOrganizationDetail` + users table filtered to `workplaceId` + `accountType = enterprise`; deep link to shared `AdminUserDetail`) | — |
| Monthly active-users report (US-208) | Implemented at `/admin/organizations/usage` (CSV export); active = chat / pathSessionCompletion / journal / assessment / dailyCheckin (UTC month) | — |

---

## 11. Suggested acceptance test pack (Admin)

1. Create flat-rate org (100 seats, Pro, annual, manual invoice) → generate code → copy join URL → enroll 100 users → 101st blocked.
2. Increase seats to 105 → 101st enroll succeeds.
3. Deactivate code → join URL fails; deactivate org → all new enrollments fail; reactivate restores.
4. Create pay-per-active org → enroll 50 → simulate activity for 40 in month M → report shows 40 for month M → export CSV.
5. Change tier Pro → Premium → spot-check one employee effective entitlement.
6. Open org roster → open employee Admin detail → see assessment/activity fields available to Admin.
7. Enterprise employee checkout attempt returns covered / no Stripe subscription created.

---

# Part B — Enterprise Organization Manager Portal

## 12. Goal

Provide a **dedicated, restricted portal** for external client administrators (HR leads, People Ops, Team Managers) so they can:

1. Manage seats and workforce membership for their organization only.
2. Share enrollment codes and join links with staff.
3. View **anonymized, aggregated** workforce analytics that prove engagement and outcome value.
4. Operate under a **strict privacy guardrail**: no access to individual clinical or personal activity data.

The portal is **not** the Platform Admin console. Managers must never see another employee’s classifications, chat logs, assessment answers, or identifiable personal activity.

---

## 13. Actors, roles & portal entry

### 13.1 Roles

| Role | Who | Portal access | Seat / invite mgmt | Org-wide analytics | Team-scoped aggregate |
|---|---|---|---|---|---|
| **Primary HR contact** | Email on `workplace.contactEmail` | Full Employer portal (`/employer`) | Yes | Yes (whole org) | Optional |
| **Delegated HR** | Member with HR role (OVR-022) | Full Employer portal | Yes | Yes (whole org) | Optional |
| **Team Manager** | Member with Manager role + direct reports | Restricted manager view (team aggregate), **not** full org HR tools unless also HR | No (unless also HR) | No org-wide HR metrics | Yes — direct reports only, aggregate + opted-in |
| **Enterprise employee** | Enrolled staff without HR/Manager | No manager portal | No | No | Only if they are a manager of others |
| **Platform Admin** | Unclouded internal | Uses Part A Admin console; may impersonate/support but privacy rules for client managers still apply to client-facing UI | — | — | — |

### 13.2 Portal entry points

| Surface | Audience | Route / location |
|---|---|---|
| **Employer portal** | Primary + delegated HR | `/employer` — seats, codes/links, invites, revoke, org-wide anonymized analytics |
| **Manager team aggregate** | Users with Manager role | Settings (or dedicated manager section) — anonymized aggregate for **direct reports** who opted in (OVR-023 / OVR-024) |
| **Nav visibility** | HR | Sidebar entry to Employer portal when `useHrWorkplaces` (or equivalent) is true |

#### Acceptance criteria — access

- [x] Non-HR users cannot open `/employer` (redirect to app home).
- [x] HR only sees workplaces they are primary contact for or have delegated HR role on.
- [x] Team Managers without HR cannot access org-wide enrollment code creation or full roster revoke tools.
- [x] Platform Admin changes in Part A (deactivate org, seat caps) are reflected in the portal within a normal refresh/session.

---

## 14. Access Control & Privacy

### 14.1 Portal-only HR skips clinical product; Team Managers take assessment

**Target behavior:** Pure **portal-only HR** accounts (primary/delegated HR without clinical enterprise enrollment — OVR-055) **must not** be required to take clinical assessments or participate in coaching paths. **Team Managers** who are enrolled enterprise members **do** take the clinical assessment like other employees.

| Rule | Spec |
|---|---|
| **Account mode** | Portal-only HR: HR contact / delegated HR without `accountType = enterprise`. Team Managers: enterprise members with manager role (clinical product applies). |
| **Assessments** | Portal-only HR: no mandatory Uncloud360 assessment. **Team Managers take the clinical assessment** (**Decided §21 / Part C**). |
| **Coaching paths** | Portal-only HR: path library / AI coach clinical flows hidden. Enrolled managers/employees: full enterprise employee IA (Part C). |
| **Seat consumption** | Pure portal-only HR accounts **do not** consume a billable/employee seat (**Decided §21**). Enrolled managers do. |
| **Exception** | Dual-mode HR (portal + employee) requires explicit enroll — clinical access follows enterprise employee rules |

**Resolved:** OVR-055 supersedes OVR-025 — primary HR is portal-only by default; dual-mode requires explicit enroll. Team Managers are clinical (not portal-only).

#### Acceptance criteria — non-clinical managers

- [x] Creating/designating primary HR does not force assessment onboarding (OVR-055).
- [x] Portal-only HR login lands on Employer portal, not assessment gate.
- [x] Clinical chat, journaling, and path home are hidden for portal-only HR.
- [x] QA can distinguish “HR-only” vs “HR + employee” in Admin and in tests.
- [x] Team Managers (enrolled) complete clinical assessment like other enterprise employees.

### 14.2 Strict privacy guardrail

Managers and HR **must not** view, export, or infer from UI/API:

| Forbidden data | Examples |
|---|---|
| Individual classifications | Per-user Uncloud360 classification / fingerprint labels |
| Chat logs | AI coach transcripts, message contents |
| Assessment answers | Question-level responses, free text |
| Personal activity | Per-user journal entries, path progress detail, crisis flags, identifiable session timelines |

**Allowed data**

| Allowed | Examples |
|---|---|
| Roster identity for ops | Name, work email, role flags, enrollment status, invite pending — **only** what is needed to manage seats |
| Aggregates | Counts, percentages, trends meeting minimum cohort thresholds |
| Seat math | `active_seats / seat_count` (or model-appropriate equivalents from Part A) |

#### Enforcement requirements (not UI-only)

- [x] APIs that power `/employer` and manager aggregate **must not** return forbidden fields for HR/Manager callers.
- [x] RLS / edge function authorization must deny profile clinical columns to HR even if someone crafts a direct query (fix any overly broad “HR selects workplace member profiles” policies).
- [x] Aggregates apply **small-cell suppression** and **minimum cohort size** before showing breakdowns (reuse existing employer/manager cohort constants; document thresholds in UI copy).
- [x] Classification breakdown shows distribution buckets only; no user ids, names, or drill-down to individuals.
- [x] UI copy states that individual coaching content and entries stay private.

#### Acceptance criteria — privacy

- [x] HR UI has no link to individual Admin-style user clinical detail.
- [x] Network responses for employer metrics contain no per-user clinical payloads.
- [x] Classification cells below suppression threshold are hidden or rolled into “Other / suppressed”.
- [x] Manager team view only includes direct reports and only opted-in members in aggregate math (existing opt-in field).
- [x] Attempting to open `/admin/users/:id` as a non–Platform Admin fails.

---

## 15. User & Seat Management

### 15.1 Seat utilization display

HR must see purchased/contracted capacity vs current usage.

| Billing model (Part A) | Display |
|---|---|
| **Flat Rate / Fixed Seats** | `active_seats / seat_count` (e.g. `87 / 100`) |
| **Pay per Active User** | Enrolled headcount, target threshold, and (if exposed to HR) current-period active count — **without** exposing who is active |

Definitions:

- **`seat_count`** — contracted quota or target from Part A (read-only for HR; only Platform Admin changes it).
- **`active_seats`** — currently enrolled / entitled employees consuming a seat (revoked users do not count).

#### Acceptance criteria — seats

- [x] Portal shows live utilization for the selected workplace.
- [x] When flat-rate seats are full, invite/enroll actions fail with a clear “no seats available” message.
- [x] HR cannot edit `seat_count`, contract tier, price, or payment terms (Part A only).

### 15.2 Enrollment codes & join links

HR can provision staff access without Platform Admin involvement (within org scope).

| Action | Spec |
|---|---|
| **View codes** | List active (and optionally deactivated) enrollment codes for the workplace |
| **Generate code** | Create a new unique code (same charset/length rules as Part A §3.3 — 6–8 characters for the short public code) |
| **Copy code** | One-click copy to clipboard |
| **Copy join link** | One-click copy of unique onboarding URL (`/join/...` per Part A §3.4) |
| **Deactivate code** | Soft-revoke so new redemptions fail |

HR must **not** change org-wide billing or contract dates via this panel.

#### Acceptance criteria — codes / links

- [x] HR can generate, copy code, copy join link, and deactivate codes for their workplace only.
- [x] Codes from Workplace A are invisible/unusable in Workplace B’s portal.
- [x] Join link uses the same validation path as employee onboarding (active org, active code, seats).

### 15.3 Add / invite / revoke employees

| Action | Spec |
|---|---|
| **Add existing user** | Attach an existing platform account by email to the workplace (subject to seats + active contract) |
| **Invite new employee** | Send email invitation; on signup, auto-enroll into workplace with org contract tier |
| **Revoke access** | Remove workplace membership / enterprise linkage so the seat is freed; user loses enterprise entitlement (fallback individual free/paid rules are Part C / billing) |
| **Roles** | HR may toggle delegated HR and Manager roles and wire direct reports (OVR-022), without exposing clinical data |

#### Acceptance criteria — membership

- [x] Invite sends email; accepting user lands in enterprise enrollment for that org.
- [x] Revoke immediately decrements `active_seats` and blocks further enterprise entitlement from that org.
- [x] Roster shows name, email, roles, enrollment/invite status — **not** classification or activity detail.
- [x] Cannot invite when org inactive or seats full (flat-rate).

---

## 16. Anonymized & Aggregated Workforce Analytics

All analytics in the Employer portal are **workforce-level**, never individual.

### 16.1 Active Engagement

Show how many enrolled employees are engaging with the app.

| Cadence | Metric | Definition (normative intent) |
|---|---|---|
| **Daily** | DAU (enterprise cohort) | Distinct enrolled users with ≥1 qualifying engagement event on the **UTC calendar day** (**Decided §21**) |
| **Weekly** | WAU | Distinct enrolled users with ≥1 qualifying event in the last **7 days** (UTC) |
| **Monthly** | MAU | Distinct enrolled users with ≥1 qualifying event in the **UTC calendar month** (**Decided §21**; aligns with Part A pay-per-active) |

**Qualifying engagement events** (align with Part A active-user definition where possible): login/session, check-in/pulse, chat message, path progress, journal entry, assessment activity.

**Presentation**

- Absolute counts and/or % of enrolled cohort.
- Optional sparklines for recent weeks.
- If cohort &lt; minimum size, suppress detailed engagement breakdowns and show “not enough data” messaging.

#### Acceptance criteria — engagement

- [x] Portal shows daily, weekly, and monthly active engagement for the selected workplace.
- [x] Metrics update from live usage (not only reassessment cycles).
- [x] No user-level engagement list is available to HR/Manager.

### 16.2 Workforce Classification Breakdown

Aggregated distribution of workforce scores/classifications **without individual identification**.

| Element | Spec |
|---|---|
| **Distribution** | % and/or count per classification bucket (labels per product taxonomy) |
| **Optional score bands** | e.g. stability high/moderate/low averages — cohort-level only |
| **Suppression** | Buckets below small-cell minimum are suppressed; entire widget hidden if cohort too small |
| **No drill-down** | Clicking a bucket must not reveal members |

#### Acceptance criteria — classification

- [x] HR sees anonymized classification distribution only.
- [x] Small-cell and min-cohort rules are enforced server-side.
- [x] Copy clarifies data is aggregated and non-identifying.

### 16.3 Progress Tracking Over Time

High-level trends showing **monthly** shifts in collective workforce scores to demonstrate platform value and outcome improvement.

| Element | Spec |
|---|---|
| **Time axis** | Monthly points (minimum last 6 months when data exists; show fewer if org is newer) |
| **Series** | Collective score indices available to the product (e.g. avg stability / performance / alignment, or % in favorable classification bands) — cohort aggregates only |
| **Interpretation** | Short helper text that trends are anonymized workforce outcomes, not individual performance management |
| **Engagement companion** | Optional monthly active % alongside score trends |

Weekly sparklines may remain as a secondary “near-term utilization” view; **monthly outcome trends are required** by this section.

#### Acceptance criteria — trends

- [x] Portal includes a monthly trend chart for collective workforce **outcome scores** (cohort avg Stability / Performance / Alignment with month-end carry-forward).
- [x] Portal also shows monthly engagement (MAU %) as a companion series.
- [x] Months with insufficient cohort data are omitted or marked unavailable — not fabricated.
- [x] No per-user time series is exposed.

### 16.4 Manager-scoped aggregate (Team Managers)

Team Managers see a **reduced** analytics surface:

- Direct reports only.
- Opt-in required for inclusion in aggregate (existing `managerAggregateOptIn` / equivalent).
- Same privacy + suppression rules.
- No enrollment code admin, no org-wide seat purchase figures beyond what product already allows (default: seat admin is HR-only).

Legal banner for manager aggregate remains env-gated per OVR-023 unless counsel requires it on.

---

## 17. Employer portal UI inventory (target)

| Block | Purpose |
|---|---|
| **Header** | “Employer portal” / workforce insights; privacy one-liner |
| **Workplace switcher** | If user is HR on multiple orgs |
| **Seat utilization** | `active_seats / seat_count` (+ pay-per-active extras if applicable) |
| **Enrollment codes & join links** | Generate / copy code / copy URL / deactivate |
| **Members** | Invite, add, revoke, HR/Manager role toggles, direct reports |
| **Active engagement** | DAU / WAU / MAU |
| **Classification breakdown** | Aggregated distribution + suppression |
| **Monthly progress trends** | Collective score shifts over months |
| **Continuous utilization (near-term)** | Optional weekly pulse/sessions sparklines |
| **Success Plan assign** | Optional HR tool per OVR-038 — must not expose clinical detail |

---

## 18. Permissions matrix (summary)

| Capability | Platform Admin | HR (primary/delegated) | Team Manager | Employee |
|---|---|---|---|---|
| Create org / set billing / seat_count | Yes | No | No | No |
| View `active_seats / seat_count` | Yes | Yes | No (default) | No |
| Generate enrollment codes & join links | Yes | Yes | No | No |
| Invite / revoke members | Yes | Yes | No | No |
| View individual clinical data | Yes | **No** | **No** | Own data only |
| Org-wide anonymized analytics | Yes | Yes | No | No |
| Direct-report anonymized aggregate | — | Optional | Yes (opt-in cohort) | — |
| Skip clinical assessment (portal-only HR) | N/A | **Yes (OVR-055)** | **No** — Team Managers take assessment | No |

---

## 19. Traceability (Part B)

| Requirement cluster | User stories / overrides / code anchors |
|---|---|
| Enrollment codes for org admins | US-206; `WorkplaceEnrollmentCodesPanel`, `employer-enrollment-codes` |
| Seat monitoring | US-207 (HR-facing subset); employer portal seat display |
| HR roster / roles | OVR-022; `WorkplaceMembersPanel`, `workplace-members` |
| Manager aggregate + legal banner | OVR-023; `ManagerTeamAggregatePanel` |
| Aggregate opt-in | OVR-024 |
| HR auto-enroll as employee | **OVR-055** supersedes OVR-025 — portal-only by default; dual-mode via explicit enroll |
| Success Plan HR assign | OVR-038 |
| Employer metrics UI | `EmployerPortal.tsx`, `employer-metrics`, continuous + assessment baseline panels |
| Privacy / Phase 2 | Phase 2 §9 — aggregate data to HR only; individual never shared with employers |

---

## 20. Current implementation snapshot (Part B baseline, not the target)

| Area | Today (approx.) | Gap vs this doc |
|---|---|---|
| Employer portal `/employer` for HR | Implemented | — |
| Seats `active / seat_count` | Implemented (`EmployerSeatUtilizationPanel` + codes panel); pay-per-active shows period active count | — |
| Enrollment codes generate/copy/deactivate | Implemented | Join URL copy via `WorkplaceEnrollmentCodesPanel` (`/join/{code}`, OVR-054) |
| Invite / add / revoke / roles | Implemented (OVR-022) | — |
| Org-wide anonymized metrics | Implemented: DAU/WAU/MAU (UTC), weekly sparklines, monthly MAU % + monthly S/P/A score trends, classification distribution + suppression | — |
| Manager team aggregate | Implemented in Settings | Not a full “manager portal”; HR-only `/employer` (Settings-only kept — §21) |
| Privacy in UI + RLS | Aggregate-only panels; HR full-row profile SELECT removed; ops RPC `list_workplace_member_ops_profiles`; workplace SELECT scoped | — |
| Managers skip clinical assessments | **Portal-only HR** skip (OVR-055). **Team Managers take assessment** (Part C locked). | Legacy dual-mode HR remain enrolled until revoked |

---

## 21. Open questions (Part B)

1. **OVR-025 vs non-clinical managers:** **Decided (OVR-055):** stop auto-enrolling primary HR; dual-mode via explicit enroll only.
2. **Do pure HR/Manager accounts consume seats?** **Decided:** no (only `accountType = enterprise` counts).
3. **Timezone for DAU:** **Decided:** UTC calendar day.
4. **MAU window:** **Decided:** UTC calendar month (aligns with Part A US-208 / pay-per-active).
5. **Team Managers on `/employer`:** **Decided:** keep Settings-only aggregate.
6. **Success Plan assignment (OVR-038):** **Decided:** remains in portal for HR (no clinical content of assignee shown).
7. **Minimum cohort size / small-cell thresholds:** **Decided for v1:** keep existing code constants (`EMPLOYER_MIN_COHORT_SIZE = 5`); revisit with counsel if needed.
8. **Team Managers + clinical assessment:** **Decided:** Team Managers **do** take the clinical assessment; only portal-only HR skips (OVR-055).

---

## 22. Suggested acceptance test pack (Manager Portal)

1. As HR: open `/employer` → see seats `n / N` → generate code → copy code → copy join link → invite employee → seat count increments.
2. As HR: revoke employee → seat frees → revoked user loses enterprise entitlement.
3. As HR: confirm metrics show DAU/WAU/MAU and classification % with no names; with cohort below minimum, metrics suppressed.
4. As HR: confirm monthly trend widget renders (or empty-state) without per-user points.
5. As Team Manager (non-HR): cannot open `/employer`; can see direct-report aggregate only for opted-in reports; cannot see chat/assessment answers.
6. As pure HR (target): login does not force clinical assessment or path onboarding.
7. As HR: API/network tab on metrics request contains no per-user classification, transcripts, or answers.
8. As employee (non-HR): no Employer portal nav; cannot redeem admin-only operations.

---

# Part C — Enterprise Employee (End-User) Experience

## 23. Goal

Deliver a seamless, **paywall-free** experience for onboarded enterprise employees:

1. Join via standard registration using an enrollment code or invite / join link.
2. Pass **active seat** (and org/code validity) checks before linkage.
3. Auto-link to the organization and receive the org’s contract tier (**Pro** or **Premium**).
4. Use the full clinical product matching that tier — with **all** pricing, upgrade, and payment surfaces hidden.

Enterprise employees never buy an individual subscription for covered access. Entitlement is owned by the workplace contract (Part A), not Stripe.

---

## 24. Actors & account state

| Actor | Who | Experience |
|---|---|---|
| **Enterprise employee** | User with `accountType = enterprise`, linked `workplaceId`, `enterpriseTier` from org | Full app at Pro/Premium; no paywall |
| **Prospective employee** | Not yet linked; has code, join URL, or pending invite | Standard signup/onboarding with enterprise enrollment step |
| **Former employee** | Revoked or org deactivated (per Part A/B policy) | Loses enterprise entitlement; falls back to individual rules (typically Free unless they later subscribe) |
| **Pure HR/Manager (Part B target)** | Non-clinical org admin | Not this Part’s primary persona — must not be forced through employee clinical onboarding |

### Canonical profile fields (after successful enrollment)

| Field | Value |
|---|---|
| `accountType` | `enterprise` |
| `workplaceId` | Organization id |
| `enterpriseTier` | `pro` \| `premium` (from `workplace.contractTier`) |
| `enrollmentDate` | Timestamp/date of successful linkage |
| Individual Stripe subscription | Not required; must not be created by enrollment |

---

## 25. Onboarding Flow

### 25.1 Entry paths

Employees may enroll through any of:

| Path | How it starts | Code handling |
|---|---|---|
| **A. Enrollment code in onboarding** | Standard registration → onboarding asks for workplace enrollment code (optional step with skip for individuals) | User types/pastes code |
| **B. Unique join / onboarding URL** | Opens `/join/{code}` (or equivalent from Part A §3.4) | Code pre-applied / locked; user still completes standard registration if new |
| **C. Email invite link** | HR/Admin invite (Part A/B) → email CTA | Pending `workplaceInvitation` applied on signup/auth; may land on `/onboarding` with invite context |

All three paths must converge on the **same** server-side enrollment validation and linkage logic.

### 25.2 Standard registration

- Use the existing individual signup (email/password or supported auth providers) — **no separate enterprise-only signup product**.
- After auth, onboarding proceeds through the normal Uncloud360 steps **plus** workplace enrollment when a code/invite/join context is present.
- If the user skips code entry and has no pending invite, they remain `accountType = individual` (non-enterprise).

### 25.3 Validation before linkage

Before setting enterprise fields, the system **must** validate:

| Check | Failure behavior |
|---|---|
| Code exists (or invite valid) | Clear error: invalid / expired code or invite |
| Code is active (not deactivated) | Clear error |
| Organization `is_active = true` | Clear error: organization not accepting enrollments |
| Within contract dates (per Part A policy) | Clear error: contract ended |
| **Active seat availability** | Flat-rate: reject when `active_seats >= seat_count`. Pay-per-active: follow Part A cap rules (soft target vs hard max) |
| User not already linked to another workplace | **Reject** with clear error (single-org rule — **Decided §31**) |

Validation must run **server-side** (RPC / edge function). Client-only checks are insufficient.

#### Acceptance criteria — validation

- [ ] Seats-full returns a specific, user-safe message (no stack traces); no partial enterprise linkage.
- [ ] Inactive org/code cannot enroll.
- [ ] Concurrent enrollments cannot oversell flat-rate seats (transactional seat check / lock).
- [ ] Invite acceptance and code redemption share the same seat rules.

### 25.4 Successful linkage & provisioning

On validation success:

1. Set `accountType = enterprise`.
2. Set `workplaceId` to the organization.
3. Set `enterpriseTier` from `contractTier` (Pro or Premium).
4. Set `enrollmentDate`.
5. Increment / recount active seats for the org.
6. Mark invite redeemed / record code redemption audit as applicable.
7. Do **not** create a Stripe Checkout session or individual paid `userSubscription` for covered access.

Effective entitlement resolution must treat enterprise users as:

- `bypassBilling = true`
- `bypassSessionLimit = true` (no Free-tier session caps)
- `tier = enterpriseTier` (pro or premium)

(Aligned with `resolveUserEntitlement` / `effective_user_tier` semantics.)

#### Acceptance criteria — provisioning

- [x] After enroll, profile shows enterprise account type and correct tier.
- [x] Employee immediately gets Pro or Premium feature access without payment.
- [x] Stripe checkout for individual plans is refused or returns “enterprise covered” for this account.
- [x] HR portal seat count reflects the new member.
- [x] Paid individual → enterprise redeem cancels Stripe collection and marks local subscription inactive.

### 25.5 Edge cases

| Case | Expected behavior |
|---|---|
| Existing individual Free user redeems valid code | Convert to enterprise; link org; tier from contract; stop showing paywall |
| Existing individual Pro/Premium (Stripe) redeems code | **Convert to enterprise; cancel individual Stripe immediately; stop collection** (**Decided §31**) |
| Join URL with bad code | Friendly error; allow fall through to normal individual signup without silent enterprise claim |
| “Add a code later” promised in copy | If product keeps this promise, Settings (or Profile) must provide redeem UI; otherwise remove the copy |
| Org tier changes after enrollment | Follow Part A sync policy (immediate vs next period) |
| Member revoked by HR | Clear enterprise fields; **restore prior personal subscription entitlement if Stripe-backed `userSubscription` still grants access; else Free** (**Decided §31** / OVR-056) |
| Logged-in user with completed onboarding opens `/join/{code}` | Redeem **in place**; toast; route to dashboard (or `/employer` if portal-only HR) |
| User already enterprise at another org | Reject with clear single-org error |

---

## 26. User Interface Adjustments — Hide paywall & billing

### 26.1 Normative rule (US-205 / Phase 2 §9)

When `accountType = enterprise` (and membership is active):

> **CRITICAL:** Stripe does not apply. No pricing screens, no upgrade prompts, no session limits. All gating checks `accountType` first. If enterprise → use `enterpriseTier`. If individual → standard tier logic.

### 26.2 Surfaces that must be completely hidden or non-actionable

| Surface | Target behavior for enterprise |
|---|---|
| **Sidebar “Subscription”** | **Hidden** (remove nav item; do not leave a dead link) |
| **`/subscription` page** | Redirect to Dashboard (or harmless account-status page **without** plans, prices, checkout, Founding Member, comparison matrix) |
| **Plan cards / checkout CTAs** | Not rendered; actions list empty |
| **Upgrade banners** | Not rendered (`SubscriptionUpgradeBannerGate` and equivalents) |
| **Locked-feature upgrade dialogs / modals** | Not shown; if feature is included in enterprise tier, unlock; if somehow above tier, show non-purchase messaging only (no Stripe) |
| **Payment recovery / past-due banners** | Not shown for enterprise-covered access |
| **Billing portal / manage payment method** | Not offered |
| **Session-limit paywalls** (Free caps) | Bypassed |
| **Settings subscription leftovers** | None (OVR-051 already moved billing to `/subscription`; ensure no Settings upsell remains) |

“Completely hidden” means: **not in navigation, not as blocking modal, not as inline upsell.** A single non-marketing status line (“Your access is provided by {Organization name} · {Pro\|Premium}”) is allowed only if product wants reassurance — **without** prices or upgrade buttons.

### 26.3 Server-side billing bypass (required companion)

UI hide is not enough:

- [ ] `stripe-checkout` (and similar) reject or no-op with enterprise-covered for enterprise accounts.
- [ ] Subscription change actions return empty / forbidden for enterprise.
- [ ] Path/chat/coach entitlement APIs use effective enterprise tier, not stale Free cache.

#### Acceptance criteria — hide paywall

- [x] Enterprise user never sees plan prices, Monthly/Yearly toggle, or Checkout confirm in normal app use.
- [x] Deep-linking to `/subscription` does not expose checkout UI (status-only: “Provided by {org} · Pro|Premium”).
- [x] Upgrade banner does not appear on Dashboard, Journal, Paths, Chat, or Results.
- [x] Free-tier session limit never triggers for active enterprise users.
- [x] Locked-feature dialogs for enterprise use contact-HR copy (no Stripe CTA); Success Plan self-purchase hidden (HR-assign only).
- [x] Sidebar Subscription nav hidden for enterprise accounts.

---

## 27. Full App Functionality (tier parity)

Enterprise employees receive **full product access matching** `enterpriseTier`, identical in capability to individually paying Pro or Premium members (except billing UI).

### 27.1 Capability matrix (intent)

| Area | Pro enterprise | Premium enterprise |
|---|---|---|
| AI chats / coach conversations | Per Pro rules (unlimited vs Free caps) | Per Premium rules |
| Path library | Pro-gated paths included | Pro + Premium paths |
| Insights / results / reassessment | Per Pro | Per Premium (incl. features Premium unlocks) |
| Journaling | Full journal access per paid tiers | Same |
| Milestones / modules / deep dives | Per Pro schedule/gates | Per Premium |
| Group coaching booking | Per Pro inclusion rules | Per Premium |
| 1:1 coach credits | Only if Premium product includes them | Per Premium credit rules |
| Success Plans | Per OVR-038 (self-serve needs add-on unless HR-assigned) | Same |
| PDF / report downloads | Per tier gates | Per tier gates |

No enterprise-only feature lock that makes employees “less than” the equivalent paid individual tier, except:

- Billing/subscription management (hidden by design).
- Employer portal (HR only).
- Explicit Success Plan add-on commerce rules (OVR-038) — HR may still assign.

### 27.2 Gating implementation rule

Every client and server gate must use **effective entitlement** (`resolveUserEntitlement` / SQL equivalent), which for enterprise reads `enterpriseTier`, not individual `profiles.tier` alone when those diverge.

#### Acceptance criteria — full functionality

- [ ] Pro enterprise can access all Pro paths and Pro chat rules; cannot access Premium-only paths.
- [ ] Premium enterprise can access Premium paths and Premium coaching credit flows as designed for Premium.
- [ ] Journal, insights, milestones work without upgrade prompts.
- [ ] Feature locked to a higher tier than the org contract still blocks — but **without** a purchase CTA (message: contact HR / org does not include this).

---

## 28. Post-onboarding employee IA

| Element | Enterprise employee |
|---|---|
| Main app nav | Standard clinical app (Dashboard, Chat, Paths, Journal, etc.) |
| Subscription nav | Hidden |
| Employer portal | Hidden unless user is also HR |
| Onboarding completion | Same clinical onboarding as individuals once enrolled (assessment, profile modules, etc.) — unless Part B pure-manager exception applies |
| Account/status copy | Optional “Provided by {Org}” on Profile |

---

## 29. Traceability (Part C)

| Requirement cluster | Stories / overrides / anchors |
|---|---|
| No pricing / upgrade for enterprise | US-205; Phase 2 §9 critical billing rule |
| Enrollment code during signup | US-206; `OnboardingWorkplaceCode`, `redeem_workplace_enrollment_code` |
| Invite auto-enroll | OVR-022; `workplaceInvitation`, `apply_pending_workplace_invitations` |
| Entitlement from workplace | `userEntitlementHelpers.ts`, billing RPCs / `effective_user_tier` |
| Checkout bypass | `stripe-checkout` enterprise_covered; `subscriptionActions` empty for enterprise |
| Upgrade banner gate | `SubscriptionUpgradeBannerGate` |
| Subscription as sidebar route | OVR-051 — **must hide for enterprise** under §26 |
| Success Plan commerce vs HR assign | OVR-038 |

---

## 30. Current implementation snapshot (Part C)

| Area | Today (approx.) | Gap vs this doc |
|---|---|---|
| Onboarding workplace code step | Implemented | — |
| Invite → enroll on signup | Implemented | — |
| Join URL logged-in in-place redeem | Implemented (`JoinWorkplacePage` → redeem when onboarding complete) | — |
| Seat validation on redeem | Implemented | — |
| Auto-link + `enterpriseTier` | Implemented | — |
| Paid → enterprise Stripe cancel | Implemented (`cancelIndividualStripeOnEnterpriseConvert` on redeem / HR assign) | Redeploy edge functions |
| Revoke restores prior sub | Implemented (`unassign_workplace_member` + OVR-056) | Apply migration |
| Entitlement bypass billing/session limits | Implemented in helpers | — |
| Stripe checkout blocked / covered | Implemented | — |
| Upgrade banners gated | Implemented (enterprise null + locked-feature HR copy) | — |
| Subscription nav + `/subscription` | Hidden for enterprise; status-only page | — |
| Success Plan for enterprise | HR-assign only (self-purchase CTA hidden) | — |
| Monthly score trends (HR) | Implemented (`monthlyScoreTrend` + panel) | Redeploy `employer-metrics` |
| Single-org enforcement | Implemented (409 already enrolled elsewhere) | — |
| “Add code later” | Copy may promise; Settings redeem UI unclear/missing | Implement or remove copy |
| Tier-parity app access | Largely via effective tier | Regression-test Pro vs Premium enterprise matrices |

---

## 31. Product decisions (Part C) — locked

1. **Existing paid individual → enterprise code:** **Decided** — convert to enterprise; cancel individual Stripe immediately and stop collection; mark local `userSubscription` inactive.
2. **Multi-workplace:** **Decided** — one org per user; reject if already linked elsewhere (clear error).
3. **Revoke fallback:** **Decided** — restore prior personal subscription entitlement if an existing Stripe-backed `userSubscription` still grants access; else Free (OVR-056). Do not invent a new Stripe subscription.
4. **Minimal status page:** **Decided** — keep `/subscription` route as **status only**: “Provided by {org} · Pro|Premium” — no prices/checkout.
5. **Success Plan add-on for enterprise:** **Decided** — HR-assign only; hide self-purchase CTA.
6. **Join URL + logged-in individual:** **Decided** — redeem in place when onboarding is complete; incomplete onboarding keeps store-code → `/onboarding` auto-redeem.

---

## 32. Suggested acceptance test pack (Enterprise Employee)

1. New user + valid code → enroll → `accountType=enterprise`, tier matches org → no Subscription nav → Dashboard has no upgrade banner.
2. New user + join URL → same as (1).
3. Invite email → signup → auto-enroll → seat increments.
4. Flat-rate org at capacity → enrollment fails with seats-full; no enterprise fields set.
5. Pro org employee: Pro paths OK; Premium-only path blocked **without** checkout modal.
6. Premium org employee: Premium paths + Premium coach credit rules work; checkout not offered.
7. Direct navigate to `/subscription` → no plan prices / Checkout.
8. `stripe-checkout` as enterprise → covered / error, no session created.
9. HR revokes user → enterprise access removed; Free gates may apply again; paywall may return.
10. Inactive code / inactive org → cannot enroll; user can continue as individual if they choose.
)
