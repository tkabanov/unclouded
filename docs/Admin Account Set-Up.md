# Admin Account Set-Up

Admin account to view and manage the platform users’ data and platform content.

The main screens and functionality of the Admin dashboard should be:

---

## User management

A screen with a table of users’ basic information:

| Field | Values |
|---|---|
| Name | — |
| Type | free, pro, premium, canceled |
| Date joined | — |
| Status | Active, Deactivated |

On click of every user, a detailed view is opened with all the user’s information.

### Detailed view should include

- Current and previous paths and sessions
- User information from settings
- Number of bookings (group sessions and 1:1 sessions)
- Credits — accumulated for 1:1 sessions for premium users
- Assessment and reassessment results
- Fingerprint status (though they don’t see it)
- Whether any of the crisis events have been triggered
- Whether grief or recovery mode is active
- Active status — journaling, chatting, sessions

### Statistics

- All users
- Active users
- Session frequency
- Pro / premium users
- Path completion data
- Classification distribution across all users

---

## Path content management

This screen includes all the paths by category (free, pro, and premium) and their full content.

- Ability to add new paths
- Ability to mark paths as free, pro, or premium
- Enable and disable paths

---

## Enterprise users

Screen to add and manage enterprise users.

1. Admin creates an Organization record in admin: org name, unique enrollment code, contract tier, seat count.
2. Employee signs up through normal onboarding.

### Organization table

| Field | Type | Description |
|---|---|---|
| `org_id` | Unique ID | Auto-generated |
| `org_name` | Text | Company name |
| `enrollment_code` | Text (unique) | 6–8 char code — e.g. `ACME-2026` |
| `contract_tier` | Option set | Pro or Premium |
| `seat_count` | Number | Total seats purchased |
| `active_seats` | Number | Current enrolled employees — auto-calculated |
| `contract_start_date` | Date | Contract start |
| `contract_end_date` | Date | Contract expiry — triggers renewal workflow |
| `hr_admin_email` | Text | HR contact for usage reports |
| `is_active` | Boolean | Whether contract is active |

### User record additions

| Field | Type | Description |
|---|---|---|
| `account_type` | Option set | individual or enterprise |
| `org_id` | Link to Organization | Null for individual users |
| `enterprise_tier` | Option set | Pro or Premium — copied from org contract |
| `enrollment_date` | Date | Date enterprise enrollment completed |
