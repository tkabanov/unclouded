# NCLDD-31 — Internal Bookings Management System

| Field | Value |
| --- | --- |
| **Jira** | [NCLDD-31](https://rapiddevelopers.atlassian.net/browse/NCLDD-31) |
| **Project** | [Unclouded](https://rapiddevelopers.atlassian.net/secure/BrowseProject.jspa?id=19777) |
| **Type** | Task |
| **Status** | In Progress |
| **Priority** | Medium |
| **Reporter** | Nareh Danielyan |
| **Assignee** | Fedor Hrakovich |
| **Created** | 2026-08-17 |
| **Updated** | 2026-08-27 |

---

## Objective

Implement a fully integrated internal booking and scheduling system for **one-on-one and group coaching sessions**, replacing the current dependency on external scheduling tools such as Wix.

The system should allow administrators to manage specialists and available sessions, while providing users with a simple booking experience. Scheduling, Google Meet creation, notifications, reminders, cancellations, credits, and post-session documentation should be handled automatically within the platform.

---

## Client clarifications (2026-08-27)

Authoritative client answers that **supersede** earlier assumptions in this ticket where they conflict. Implementation and test plan must follow these rules.

### CL-1 — Credits and booking sessions

#### 1:1 sessions (Premium only)

| Rule | Detail |
| --- | --- |
| Entitlement | **Premium only**. Free users cannot book 1:1. |
| Cost | **2 coaching credits** per session |
| Sign-up grant | Upon Premium sign-up, user receives **2 coaching credits** pre-loaded (first session effectively free) |
| Monthly accrual | **1** new coaching credit awarded to Premium users on the **1st of each month** |
| Rollover | Credits accumulate month to month |
| Cap | Maximum balance **6** credits (3 sessions worth). Accrual **stops** once the balance hits the cap |
| Scope | Credits apply **only** to 1:1 sessions — never to group sessions |

#### Group sessions (Pro and Premium)

| Rule | Detail |
| --- | --- |
| Entitlement | **Pro and Premium**. Free users cannot book group sessions |
| Model | **No credits**. Monthly gate via `group_sessions_used_this_month` on the User record |
| Monthly reset | Reset counter to **0** on the **1st of each month** for all eligible (Pro/Premium) users |
| Book check | Allow booking only if `group_sessions_used_this_month < 1`; then increment to **1** |
| Blocked message | `You've used your included group session for this month. Your next session is available on [date].` |
| Cancel ≥24h before | Reset `group_sessions_used_this_month` to **0** (user may book another group session that month) |
| Cancel &lt;24h before | Counter **stays at 1** (session considered used for the month) |

#### Data model (User)

| Field | Type | Purpose |
| --- | --- | --- |
| `coaching_credits` | number | 1:1 wallet. Accumulates monthly. Cap 6. Not used for group |
| `group_sessions_used_this_month` | number | Monthly gate for group (0 or 1). Resets on 1st. Not a credit wallet |

---

### CL-2 — Coach assignment (when system auto-assigns)

When multiple coaches are available for the same slot (e.g. admin leave-to-system assignment, or legacy auto-assign paths still used):

1. Prefer the coach with the **lowest session load for the current calendar month** (fewest sessions assigned that month).
2. If load is equal, assign **randomly**.
3. Admin can **manually adjust or override** any assignment at any time in the admin panel.

> **Note:** CL-9 changes the primary user flow to **user-selected coach**. Auto-assign remains for admin override defaults / any remaining non-user-selected paths.

---

### CL-3 — Coach reassignment after booking

When an admin reassigns the coach on an existing booking, the system must:

1. **Update** the Google Calendar event (new coach as attendee / organizer as applicable).
2. **Notify** the previous coach that they have been removed.
3. **Send** a new Calendar invitation and notification to the newly assigned coach.
4. **Notify** the user that their coach has been updated.
5. **Resend** the coaching brief (Pre-Coaching Brief / Kota's Read) to the new coach.

---

### CL-4 — Time zone logic

| Context | Rule |
| --- | --- |
| Available slots (UI) | User's **local timezone**, detected automatically from the device |
| User-facing emails | Times in the **user's** local timezone |
| Coach-facing emails | Times in the **coach's** local timezone |
| 24-hour cancellation rule | Calculated in **UTC**; deadline **displayed** in the user's local timezone |
| Hardcoding | Do **not** hardcode EST (or any single zone). Users and coaches span multiple time zones |

---

### CL-5 — Google Meet for sessions

- Google Meet links for **both** 1:1 and **group** sessions.
- Every session needs a **unique** meeting link generated at **creation** time.

---

### CL-6 — Group session cancellations

| Event | `group_sessions_used_this_month` | Spot / waitlist |
| --- | --- | --- |
| User cancels **≥24h** before | Reset to **0** | Spot opens; waitlist promoted automatically |
| User cancels **&lt;24h** before | Stays at **1** | Spot still opens; waitlist still promoted. No further penalty |
| Admin cancels **entire** session | Reset to **0** for **all** enrolled users | Notify all enrolled users immediately |

---

### CL-7 — When a session is considered complete

1. Mark the session **Completed automatically** once the scheduled **end time** has passed — do **not** wait for the coach post-session form.
2. Coach notes submission is tracked **separately** as a pending item (form may still be outstanding after Completed).
3. Post-session form must remain connected to **Kota** so Kota has the latest notes from the live 1:1 session.
4. Send a **5-minute warning notification** to the user before the session ends so they know it is closing.

---

### CL-8 — Waitlist claim window

- First person on the waitlist gets **2 hours** to claim the spot after notification.
- If they do not claim within 2 hours, automatically offer the spot to the **next** waitlisted user and notify them.
- Repeat until someone claims or the waitlist is exhausted.

> **Supersedes** earlier confirmation of a **24-hour** claim window.

---

### CL-9 — Coach name / profile & user choice *(requirement update)*

Users **can see coaches and choose** who they book with, including rebooking the same coach.

#### During slot selection

| Case | UX |
| --- | --- |
| User has had a previous 1:1 session | Show their **most recent coach first** with a **“Book again with [Coach Name]”** option; display that coach’s available slots prominently |
| First-time 1:1 booker | Show the **full coach roster** (name, photo, short **2-line bio**) alongside available slots |
| Any time | Users can **browse all available coaches** regardless of history |

#### After booking

- Coach name in the **confirmation email**
- Coach name in the user's **session history**

> **Supersedes** earlier rules that hid specialist names and auto-assigned without user choice.

---

### CL-10 — Coach deactivation with existing bookings

- **Prevent** deactivation while the coach has future sessions.
- Warning copy: `This coach has [X] upcoming sessions. Please reassign or cancel them before deactivating.`
- Do **not** auto-reassign or auto-cancel — admin resolves each session manually.

---

## Scope & Requirements

### 1. Admin Panel — Specialist Management — done (CL-10 + coach TZ)

Add a dedicated **Specialists Management** section in the Admin Panel.

Admins should be able to:

- [done] Add new specialists/coaches
- [done] Edit specialist information
- [done] Deactivate/remove specialists when they are no longer available — **blocked until future bookings resolved** (CL-10)
- [done] View the list of active and inactive specialists

Each specialist should have:

- [done] Name
- [done] Email address
- [done] Profile image
- [done] Description/bio (shown to users as ~2-line bio per CL-9)
- [done] Availability status
- [done] Timezone for coach-facing emails (CL-4) — admin-editable IANA on Specialist (`specialist.timezone`; empty → UTC in mailers)

[done] Specialists **do not need platform accounts or login credentials**. Their interaction with the platform will be handled primarily through automated email notifications and post-session forms.

---

### 2. Admin Panel — Scheduling & Availability — done (CL-9 coach choice)

Provide an administrative scheduling interface where admins can configure when specialists are available for coaching sessions.

Admins should be able to:

- [done] Select a specialist
- [done] Define available dates and time slots
- [done] Set the session duration
- [done] Create, edit, or remove availability
- [done] View scheduled sessions and existing bookings
- [done] Prevent overlapping bookings for the same specialist
- [done] See whether a time slot is available, booked, or unavailable

[done] The system should support **30-minute coaching slots** as the standard booking unit, while allowing the duration to be configurable if required.

[done] For users, availability is shown **per selected coach** (and “book again” prominence) per CL-9 — not a fully anonymized consolidated calendar that hides coaches.

[done] Users **choose** the specialist for one-on-one sessions (CL-9). Auto-assign by lowest monthly load (CL-2) applies only where the product still auto-assigns (`pick_specialist_for_one_on_one_slot` / confirm without `p_specialist_id`).

---

### 3. User Flow — One-on-One Booking — done (CL-1 credits + CL-9)

The booking flow should work as follows:

1. [done] User opens the coaching booking section (Premium only for 1:1 — CL-1).
2. [done] User views coaches and/or available dates and time slots in **device local timezone** (CL-4, CL-9).
3. [done] Returning users see **“Book again with [Coach]”** + that coach’s slots first; first-timers see full roster (CL-9).
4. [done] User may browse the full coach roster at any time (CL-9).
5. [done] User selects coach + available time slot.
6. [done] The system verifies that the slot is still available.
7. [done] Credits: check balance ≥ 2, deduct 2 on successful booking; enforce cap/accrual rules (CL-1).
8. [done] Specialist is the user-selected coach (CL-9); admin may override later (CL-2 / CL-3).
9. [done] Admin can assign or change the assigned specialist (reassignment side effects per CL-3).
10. [done] A corresponding Google Calendar event and Google Meet link are automatically created (unique Meet — CL-5).
11. [done] Confirmation emails include **coach name**; times in recipient-local TZ (CL-4, CL-9). *(User TZ = `profiles.timeZone`, empty → UTC; coach TZ = `specialist.timezone`.)*
12. [done] Booking in user session history shows **coach name** (CL-9).

[done] The booking should be treated as confirmed only after all required booking and credit validations are successfully completed.

Free users: cannot book 1:1 or group (CL-1).

---

### 4. Google Meet & Calendar Integration — done (CL-5 group Meet + CL-3 reassign)

For each confirmed session (**1:1 and group**):

- [done] Automatically create a Google Calendar event (1:1)
- [done] Automatically create Google Calendar event + **unique Meet link for group sessions** as well (CL-5)
- [done] Automatically generate a Google Meet link
- [done] Associate the meeting with the booking record
- [done] Include the meeting link in the confirmation emails
- [done] Ensure the correct session date, time, duration, user, and specialist are included in the event
- [done] Store the meeting/event information in the platform for future reference
- [done] On coach **reassignment**, update the Calendar event and invitations (CL-3)

[done] If the booking is canceled, the associated Google Calendar event / Google Meet session should also be canceled automatically.

---

### 5. Email Notifications & Automations — update CL-3, CL-4, CL-7, CL-9

The system should automatically send relevant email notifications throughout the booking lifecycle.

#### Booking Confirmation

**User receives:**

- [done] Session date and time — in **user local TZ** (CL-4)
- [done] Session duration
- [done] Google Meet link
- [done] Booking confirmation details
- [done] **Coach name** (CL-9)

**Specialist receives:**

- [done] User name and relevant user information
- [done] Session date and time — in **coach local TZ** (CL-4)
- [done] Google Meet link
- [done] Any required coaching information

#### Pre-Coaching Brief

[done] Immediately after booking, automatically send the specialist a **Pre-Coaching Brief** email.

[done] On **reassignment**, resend the brief to the new coach (CL-3).

#### Automated Reminders

Send reminders to both the user and specialist:

- [done] **24 hours before the session**
- [done] **1 hour before the session**
- [done] **5 minutes before session end** — **email** warning to the **user** that the session is closing (CL-7 / G3)

[done] The system should ensure that reminders are not sent for canceled sessions.

#### Reassignment notifications (CL-3)

- [done] Previous coach: removed from session
- [done] New coach: invitation + notification + brief
- [done] User: coach updated

---

### 6. Post-Session Coach Form — update CL-7

Provide a dedicated post-session form that allows the specialist to submit session notes after completing a coaching session.

The form should allow the specialist to:

- [done] Identify the relevant session
- [done] Add coaching/session notes
- [done] Submit the completed form without requiring a platform account

Once submitted:

- [done] The notes should automatically be associated with the correct booking/session
- [done] The notes should be stored in the user's session history
- [done] Admins should be able to view the notes from the Admin Panel
- [done] Session status is **not** gated on form submit — status becomes **Completed** at scheduled end time (CL-7)
- [done] Track whether the coach has submitted the form as a **separate pending** flag/item (`postSessionSubmittedAt` / Form Pending|Submitted)
- [done] Form submission feeds **Kota** with the latest live-session notes (CL-7 / G9 — append into `chat_session_memory`)

[done] The system should prevent unauthorized access to other users' session information.

---

### 7. Cancellations & Credit Refunds — update CL-1, CL-4

[done] Users should be able to cancel their upcoming bookings directly from the platform.

When a 1:1 booking is canceled:

- [done] The booking status should be updated to **Canceled**
- [done] The associated Google Calendar event / Google Meet session should be canceled
- [done] The available time slot should become available for another user
- [done] The system should automatically determine whether the user qualifies for a credit refund based on the cancellation time (**UTC** calculation; display in user local TZ — CL-4)

#### 1:1 Refund Rules

| Window | Credit refund |
| --- | --- |
| [done] Cancellation **24+ hours** before the session | Full session credit refund (**+2** credits), subject to cap **6** |
| [done] Cancellation **within &lt;24 hours** of the session | No credit refund |

#### Group cancellation counter rules — see CL-1 / CL-6

Admins should have the ability to manually:

- [done] Add credits to a user
- [done] Remove credits from a user
- [done] Correct/refund credits
- [done] Resolve exceptional booking or cancellation cases

[done] All manual credit adjustments should be recorded in an appropriate transaction/history log where applicable.

---

### 8. Group Coaching — update CL-1, CL-5, CL-6

The system should also support recurring **group coaching sessions**.

**Admins should be able to:**

- [done] Create group coaching sessions
- [done] Configure recurring schedules
- [done] Set session date/time and duration
- [done] Add a session title and description
- [done] Define a maximum participant capacity
- [done] View registered participants
- [done] Manage/cancel sessions when necessary — on full cancel: reset all enrolled users’ monthly group counter + notify all (CL-6)
- [done] Ensure unique Google Meet link at session creation (CL-5)

**Users should be able to:**

- [done] View available group coaching sessions
- [done] View the session title, description, date, time, and available capacity
- [done] Join a group session if seats are available **and** `group_sessions_used_this_month < 1` (CL-1)
- [done] Join a waitlist when the session has reached its participant limit
- [done] View their registered group sessions in their session history

Blocked copy when monthly group already used (CL-1):  
`You've used your included group session for this month. Your next session is available on [date].`

---

### 9. Group Coaching Waitlist — update CL-8

When a group session reaches its participant limit:

- [done] The **Join Session** option should no longer be available
- [done] Users should be able to join a waitlist
- [done] The system should maintain the waitlist in the order users joined
- [done] When a participant cancels and a spot becomes available, the system should notify the next eligible waitlisted user
- [done] The user should be able to claim the available spot through the platform
- [done] The system should prevent multiple users from claiming the same newly available spot

[done] Waitlist claim-window duration: **2 hours** after promotion (CL-8). On expiry, auto-offer next in line.

---

### 10. Admin Booking Management — update CL-2, CL-3, CL-7

Admins should have a centralized view of all coaching bookings.

The booking management screen should provide:

- [done] User name
- [done] Session type (One-on-One / Group)
- [done] Specialist, where applicable
- [done] Date and time
- [done] Duration
- [done] Booking status
- [done] Credit/refund status
- [done] Google Meet link
- [done] Notes/session history
- [done] Post-session form pending vs submitted (CL-7)
- [done] Participant information for group sessions

Admins should be able to filter and search bookings by relevant criteria such as:

- [done] Date
- [done] User
- [done] Specialist
- [done] Session type
- [done] Status

[done] Admins should also be able to manually manage exceptional cases, including credit adjustments and booking corrections (via existing cancel / reassign / User Detail credit adjust flows from the Bookings expand panel).

[done] Reassign coach triggers full CL-3 side effects (Calendar, emails, brief, user notify).

#### Booking Statuses

| Status | Notes |
| --- | --- |
| **Scheduled** | Display label for confirmed/pending 1:1 and registered/offered group enrollments |
| **Completed** | Set automatically when scheduled **end time** has passed (CL-7); independent of coach form |
| **Canceled** | Booking canceled |
| **Waitlisted** | Group coaching only |

[done] The status should be updated automatically where possible based on system events. UI labels map over existing DB values (`confirmed` → Scheduled, etc.).

---

## Key Business Rules

1. [done] A time slot cannot be booked by multiple users.
2. [done] The system must verify availability immediately before confirming a booking.
3. [done] Session credits should only be deducted after a booking is successfully confirmed.
4. [done] Premium 1:1: cost **2** credits; signup grant **2**; monthly accrual **+1** on the 1st; **cap 6**; credits never apply to group (CL-1). *(Wallet = `premiumCreditLedger` / `available_premium_credits`.)*
5. [done] Group: Pro/Premium monthly gate via `group_sessions_used_this_month`; Free blocked; cancel/admin rules per CL-1 / CL-6.
6. [done] Canceled sessions should not trigger future reminders.
7. [done] Google Meet / Calendar events must remain synchronized with booking status.
8. [done] Unique Meet link for every 1:1 **and** group session at creation (CL-5).
9. [done] Specialists should not require platform accounts.
10. [done] Users **select** coaches for 1:1; roster / book-again UX per CL-9 (supersedes “hide specialist names”).
11. [done] Auto-assign (when used): lowest monthly load, then random; admin override anytime (CL-2).
12. [done] Reassignment: Calendar update + previous/new coach + user notify + resend brief (CL-3).
13. [done] Timezones: device-local slots; emails in recipient TZ (incl. waitlist offers); 24h rule in UTC (CL-4).
14. [done] Completed at scheduled end; coach form tracked separately; Kota fed on submit; 5-min end warning to user (CL-7).
15. [done] Waitlist claim window **2 hours**, cascade to next (CL-8).
16. [done] Coach deactivation blocked while upcoming sessions remain (CL-10).
17. [done] Group sessions must enforce participant capacity.
18. [done] Waitlisted users must be notified when capacity becomes available.
19. [done] All completed sessions and coach notes should be reflected in the user's session history and available to authorized admins.

---

## Open Decisions / remaining gaps

Answered by client 2026-08-27 (CL-1 … CL-10). Remaining items to confirm before treating the ticket as **fully** specified:

| # | Gap | Why it matters |
| --- | --- | --- |
| G1 | **Coach timezone source** | **Resolved 2026-08-27:** admin-editable IANA field `specialist.timezone`; coach-facing emails use it (fallback UTC). |
| G2 | **User timezone persistence** | **Resolved:** user-facing booking emails use `profiles.timeZone` (About You / device bootstrap); empty → UTC. |
| G3 | **5-minute end warning channel** | **Resolved:** **email only** (same channel as 24h/1h reminders); no in-app/push in this slice. |
| G4 | **Credit accrual vs paid month** | **Resolved:** +1 on the **1st** for users with `effective_user_tier = premium` that day (includes canceled-but-still-premium period). |
| G5 | **Refund at credit cap** | **Resolved:** cancel ≥24h refunds are **truncated** so balance never exceeds **6**. |
| G6 | **Group waitlist + monthly gate** | **Resolved:** skip promote when candidate already has `groupSessionsUsedThisMonth = 1` (cancel that waitlist row and try next). |
| G7 | **“Book again” when recent coach inactive / no slots** | **Resolved:** fall back to full roster (no dead Book-again CTA). |
| G8 | **Group Meet host / Calendar attendees** | **Resolved:** service-account calendar (`GOOGLE_CALENDAR_ID`) owns events; group sessions have **no** Calendar attendees (Meet link via platform). 1:1 reassign PATCHes attendees to member + new coach. |
| G9 | **Kota sync on post-session form** | **Resolved:** on form submit, append a `human-coach:{bookingId}` record into member `chat_session_memory` (last-5 ring); stamp `postSessionKotaSyncedAt`. Does not regenerate Pre-Coaching Brief. |
| G10 | **Monthly jobs** | **Done for credits + group counter:** +1 Premium credit (capped) + reset `groupSessionsUsedThisMonth` on 1st UTC via `subscription-lifecycle`. Waitlist expire/promote runs every 5m (`group-coaching-waitlist`). |

**Product-overrides impact:** CL-1 refines OVR-027 (signup 2, monthly +1, cap 6) and OVR-028 (explicit counter field + cancel reset rules). CL-9 / CL-8 / CL-7 contradict earlier ticket text and parts of the existing test plan — update `docs/product-overrides.md` and `docs/NCLDD-31-internal-bookings-test-plan.md` when implementing.

---

## Implementation readiness verdict

**Product CL gaps closed** (CL-1…CL-10 / G1–G10 as documented). Remaining work is **ops deploy** of migrations/edges and **QA** against the updated test plan — not missing product rules.

**Shipped delta slices:**

- ~~Credit/cap/signup/accrual + group counter semantics (CL-1, CL-6)~~ **done** (OVR-059 / OVR-060)
- ~~User-visible coach choice + book-again (CL-9)~~ **done**
- ~~Waitlist 2h claim (CL-8)~~ **done**
- ~~Auto-Complete at end time + form pending + Kota feed on submit (CL-7)~~ **done**
- ~~Reassignment notification bundle (CL-3)~~ **done**
- ~~Deactivation guard (CL-10)~~ **done**
- ~~TZ display rules (CL-4)~~ **done** (device-local slots; recipient-TZ emails incl. waitlist; 24h UTC)

Core admin CRUD, Meet for 1:1/group, reminders 24h/1h/end5m, cancel refunds, and waitlist expire/promote remain as built — verify via QA after deploy.

---

*Source: stakeholder requirements for NCLDD-31; client clarifications 2026-08-27 (CL-1–CL-10).*
