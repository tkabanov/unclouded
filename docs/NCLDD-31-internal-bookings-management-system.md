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
| **Updated** | 2026-08-21 |

---

## Objective

Implement a fully integrated internal booking and scheduling system for **one-on-one and group coaching sessions**, replacing the current dependency on external scheduling tools such as Wix.

The system should allow administrators to manage specialists and available sessions, while providing users with a simple booking experience. Scheduling, Google Meet creation, notifications, reminders, cancellations, credits, and post-session documentation should be handled automatically within the platform.

---

## Scope & Requirements

### 1. Admin Panel — Specialist Management - done

Add a dedicated **Specialists Management** section in the Admin Panel.

Admins should be able to:

- Add new specialists/coaches
- Edit specialist information
- Deactivate/remove specialists when they are no longer available
- View the list of active and inactive specialists

Each specialist should have:

- Name
- Email address
- Profile image
- Description/bio
- Availability status

Specialists **do not need platform accounts or login credentials**. Their interaction with the platform will be handled primarily through automated email notifications and post-session forms.

---

### 2. Admin Panel — Scheduling & Availability - done

Provide an administrative scheduling interface where admins can configure when specialists are available for coaching sessions.

Admins should be able to:

- Select a specialist
- Define available dates and time slots
- Set the session duration
- Create, edit, or remove availability
- View scheduled sessions and existing bookings
- Prevent overlapping bookings for the same specialist
- See whether a time slot is available, booked, or unavailable

The system should support **30-minute coaching slots** as the standard booking unit, while allowing the duration to be configurable if required.

For users, availability should be presented as a **consolidated calendar** combining availability across all eligible specialists.

Users should **not see the specialist/coach name when selecting a one-on-one session**. The system should automatically assign an available specialist after the user confirms the booking.

---

### 3. User Flow — One-on-One Booking - done

1. User opens the coaching booking section.
2. User views available dates and time slots.
3. The calendar displays consolidated availability across all eligible specialists.
4. Specialist names are not displayed to the user.
5. User selects an available time slot.
6. The system verifies that the slot is still available.
7. The required number of session credits is checked and deducted upon successful booking.
8. The system assigns an available specialist to the booking.
9. Admin can assign or change the assigned specialist.
10. A corresponding Google Calendar event and Google Meet link are automatically created.
11. Confirmation emails are sent to both the user and the assigned specialist.
12. The booking is added to the user's session history and the Admin Panel.

The booking should be treated as confirmed only after all required booking and credit validations are successfully completed.

---

### 4. Google Meet & Calendar Integration

For each confirmed one-on-one session:

- Automatically create a Google Calendar event
- Automatically generate a Google Meet link
- Associate the meeting with the booking record
- Include the meeting link in the confirmation emails
- Ensure the correct session date, time, duration, user, and specialist are included in the event
- Store the meeting/event information in the platform for future reference

If the booking is canceled, the associated Google Calendar event / Google Meet session should also be canceled automatically.

---

### 5. Email Notifications & Automations

The system should automatically send relevant email notifications throughout the booking lifecycle.

#### Booking Confirmation

**User receives:**

- Session date and time
- Session duration
- Google Meet link
- Booking confirmation details

**Specialist receives:**

- User name and relevant user information
- Session date and time
- Google Meet link
- Any required coaching information

#### Pre-Coaching Brief

Immediately after booking, automatically send the specialist a **Pre-Coaching Brief** email containing the information required to prepare for the session.

#### Automated Reminders

Send reminders to both the user and specialist:

- **24 hours before the session**
- **1 hour before the session**

Reminders must not be sent for canceled sessions.

---

### 6. Post-Session Coach Form

Provide a dedicated post-session form that allows the specialist to submit session notes after completing a coaching session.

The form should allow the specialist to:

- Identify the relevant session
- Add coaching/session notes
- Submit the completed form without requiring a platform account

Once submitted:

- Notes are automatically associated with the correct booking/session
- Notes are stored in the user's session history
- Admins can view the notes from the Admin Panel
- The session should be marked as completed once the required post-session information is submitted, where applicable

The system should prevent unauthorized access to other users' session information.

---

### 7. Cancellations & Credit Refunds

Users should be able to cancel their upcoming bookings directly from the platform.

When a booking is canceled:

- Booking status → **Canceled**
- Associated Google Calendar event / Google Meet session is canceled
- The time slot becomes available for another user
- System determines whether the user qualifies for a credit refund based on cancellation time

#### Refund Rules

| Window | Credit refund |
| --- | --- |
| **24+ hours** before session | Full session credit refund |
| **Within 2 hours** of session | No credit refund |
| **Between 2 and 24 hours** before session | Apply configured business rule (confirm before implementation if undefined) |

Admins should be able to manually:

- Add credits to a user
- Remove credits from a user
- Correct/refund credits
- Resolve exceptional booking or cancellation cases

All manual credit adjustments should be recorded in an appropriate transaction/history log where applicable.

---

### 8. Group Coaching

The system should also support recurring **group coaching sessions**.

**Admins should be able to:**

- Create group coaching sessions
- Configure recurring schedules
- Set session date/time and duration
- Add a session title and description
- Define a maximum participant capacity
- View registered participants
- Manage/cancel sessions when necessary

**Users should be able to:**

- View available group coaching sessions
- View session title, description, date, time, and available capacity
- Join a group session if seats are available
- Join a waitlist when the session has reached its participant limit
- View their registered group sessions in session history

---

### 9. Group Coaching Waitlist

When a group session reaches its participant limit:

- **Join Session** is no longer available
- Users can join a waitlist
- Waitlist is maintained in join order
- When a participant cancels and a spot opens, notify the next eligible waitlisted user
- User can claim the available spot through the platform
- System prevents multiple users from claiming the same newly available spot

The claim-window duration for waitlisted users should be configurable or confirmed before implementation.

---

### 10. Admin Booking Management

Admins should have a centralized view of all coaching bookings with:

- User name
- Session type (One-on-One / Group)
- Specialist (where applicable)
- Date and time
- Duration
- Booking status
- Credit/refund status
- Google Meet link
- Notes/session history
- Participant information for group sessions

Filter/search by:

- Date
- User
- Specialist
- Session type
- Status

Admins should also be able to manually manage exceptional cases, including credit adjustments and booking corrections.

---

## Booking Statuses

| Status | Notes |
| --- | --- |
| **Scheduled** | Confirmed upcoming booking |
| **Completed** | Session finished (e.g. after post-session form) |
| **Canceled** | Booking canceled |
| **Waitlisted** | Group coaching only |

Statuses should update automatically where possible based on system events.

---

## Key Business Rules

1. A time slot cannot be booked by multiple users.
2. Availability must be verified immediately before confirming a booking.
3. Session credits are deducted only after a booking is successfully confirmed.
4. Canceled sessions must not trigger future reminders.
5. Google Meet / Calendar events must stay synchronized with booking status.
6. Specialists do not require platform accounts.
7. Users must not see specialist names during one-on-one booking.
8. Group sessions must enforce participant capacity.
9. Waitlisted users must be notified when capacity becomes available.
10. Completed sessions and coach notes must appear in the user's session history and be available to authorized admins.

---

## Open Decisions (from ticket)

- Exact refund behavior for the **2–24 hour** cancellation window (confirm if no existing business rule).
- Waitlist claim-window duration (configurable or confirm before implementation).

---

*Source: Jira export NCLDD-31 (Word/HTML), retrieved 2026-08-21.*
