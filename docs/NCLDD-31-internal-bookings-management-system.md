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
| **Updated** | 2026-08-24 |

---

## Objective

Implement a fully integrated internal booking and scheduling system for **one-on-one and group coaching sessions**, replacing the current dependency on external scheduling tools such as Wix.

The system should allow administrators to manage specialists and available sessions, while providing users with a simple booking experience. Scheduling, Google Meet creation, notifications, reminders, cancellations, credits, and post-session documentation should be handled automatically within the platform.

---

## Scope & Requirements

### 1. Admin Panel — Specialist Management — done

Add a dedicated **Specialists Management** section in the Admin Panel.

Admins should be able to:

- [done] Add new specialists/coaches
- [done] Edit specialist information
- [done] Deactivate/remove specialists when they are no longer available
- [done] View the list of active and inactive specialists

Each specialist should have:

- [done] Name
- [done] Email address
- [done] Profile image
- [done] Description/bio
- [done] Availability status

[done] Specialists **do not need platform accounts or login credentials**. Their interaction with the platform will be handled primarily through automated email notifications and post-session forms.

---

### 2. Admin Panel — Scheduling & Availability — done

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

[done] For users, availability should be presented as a **consolidated calendar** combining availability across all eligible specialists.

[done] Users should **not see the specialist/coach name when selecting a one-on-one session**. The system should automatically assign an available specialist after the user confirms the booking.

---

### 3. User Flow — One-on-One Booking — done

The booking flow should work as follows:

1. [done] User opens the coaching booking section.
2. [done] User views available dates and time slots.
3. [done] The calendar displays consolidated availability across all eligible specialists.
4. [done] Specialist names are not displayed to the user.
5. [done] User selects an available time slot.
6. [done] The system verifies that the slot is still available.
7. [done] The required number of session credits is checked and deducted upon successful booking.
8. [done] The system assigns an available specialist to the booking.
9. [done] Admin can assign or change the assigned specialist.
10. [done] A corresponding Google Calendar event and Google Meet link are automatically created.
11. [done] Confirmation emails are sent to both the user and the assigned specialist.
12. [done] The booking is added to the user's session history and the Admin Panel.

[done] The booking should be treated as confirmed only after all required booking and credit validations are successfully completed.

---

### 4. Google Meet & Calendar Integration — done

For each confirmed one-on-one session:

- [done] Automatically create a Google Calendar event
- [done] Automatically generate a Google Meet link
- [done] Associate the meeting with the booking record
- [done] Include the meeting link in the confirmation emails
- [done] Ensure the correct session date, time, duration, user, and specialist are included in the event
- [done] Store the meeting/event information in the platform for future reference

[done] If the booking is canceled, the associated Google Calendar event / Google Meet session should also be canceled automatically.

---

### 5. Email Notifications & Automations — done

The system should automatically send relevant email notifications throughout the booking lifecycle.

#### Booking Confirmation — done

**User receives:**

- [done] Session date and time
- [done] Session duration
- [done] Google Meet link
- [done] Booking confirmation details

**Specialist receives:**

- [done] User name and relevant user information
- [done] Session date and time
- [done] Google Meet link
- [done] Any required coaching information

#### Pre-Coaching Brief — done

[done] Immediately after booking, automatically send the specialist a **Pre-Coaching Brief** email containing the information required to prepare for the session.

#### Automated Reminders — done

Send reminders to both the user and specialist:

- [done] **24 hours before the session**
- [done] **1 hour before the session**

[done] The system should ensure that reminders are not sent for canceled sessions.

---

### 6. Post-Session Coach Form — done

Provide a dedicated post-session form that allows the specialist to submit session notes after completing a coaching session.

The form should allow the specialist to:

- [done] Identify the relevant session
- [done] Add coaching/session notes
- [done] Submit the completed form without requiring a platform account

Once submitted:

- [done] The notes should automatically be associated with the correct booking/session
- [done] The notes should be stored in the user's session history
- [done] Admins should be able to view the notes from the Admin Panel
- [done] The session should be marked as completed once the required post-session information is submitted, where applicable

[done] The system should prevent unauthorized access to other users' session information.

---

### 7. Cancellations & Credit Refunds

[done] Users should be able to cancel their upcoming bookings directly from the platform.

When a booking is canceled:

- [done] The booking status should be updated to **Canceled**
- [done] The associated Google Calendar event / Google Meet session should be canceled
- [done] The available time slot should become available for another user
- [done] The system should automatically determine whether the user qualifies for a credit refund based on the cancellation time

#### Refund Rules

| Window | Credit refund |
| --- | --- |
| [done] Cancellation **24+ hours** before the session | Full session credit refund |
| [done] Cancellation **within <24 hours** of the session | No credit refund |

Admins should have the ability to manually:

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
- View the session title, description, date, time, and available capacity
- Join a group session if seats are available
- Join a waitlist when the session has reached its participant limit
- View their registered group sessions in their session history

---

### 9. Group Coaching Waitlist

When a group session reaches its participant limit:

- The **Join Session** option should no longer be available
- Users should be able to join a waitlist
- The system should maintain the waitlist in the order users joined
- When a participant cancels and a spot becomes available, the system should notify the next eligible waitlisted user
- The user should be able to claim the available spot through the platform
- The system should prevent multiple users from claiming the same newly available spot

The business rule for the duration a waitlisted user has to claim an available spot should be configurable or confirmed before implementation.

---

### 10. Admin Booking Management

Admins should have a centralized view of all coaching bookings.

The booking management screen should provide:

- User name
- Session type (One-on-One / Group)
- Specialist, where applicable
- Date and time
- Duration
- Booking status
- Credit/refund status
- Google Meet link
- Notes/session history
- Participant information for group sessions

Admins should be able to filter and search bookings by relevant criteria such as:

- Date
- User
- Specialist
- Session type
- Status

Admins should also be able to manually manage exceptional cases, including credit adjustments and booking corrections.

#### Booking Statuses

The system should support clear booking statuses, such as:

| Status | Notes |
| --- | --- |
| **Scheduled** | Confirmed upcoming booking |
| **Completed** | Session finished (e.g. after post-session form) |
| **Canceled** | Booking canceled |
| **Waitlisted** | Group coaching only |

The status should be updated automatically where possible based on system events.

---

## Key Business Rules

1. [done] A time slot cannot be booked by multiple users.
2. [done] The system must verify availability immediately before confirming a booking.
3. [done] Session credits should only be deducted after a booking is successfully confirmed.
4. [done] Canceled sessions should not trigger future reminders.
5. [done] Google Meet / Calendar events must remain synchronized with booking status.
6. [done] Specialists should not require platform accounts.
7. [done] Users should not be exposed to specialist names during one-on-one booking.
8. Group sessions must enforce participant capacity.
9. Waitlisted users must be notified when capacity becomes available.
10. [done] All completed sessions and coach notes should be reflected in the user's session history and available to authorized admins.

---

## Open Decisions

- Waitlist claim-window duration (configurable or confirm before implementation).

---

*Source: stakeholder requirements for NCLDD-31, updated 2026-08-24.*
