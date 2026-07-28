### **Unclouded | Individual Subscription Management**

**Objective**  
Build subscription management for individual users, including:

* Free, Pro, Premium, and Founding Member plans  
* Monthly and yearly billing options  
* Plan upgrades and downgrades  
* Subscription cancellation and resumption  
* Premium credit accrual and redemption  
* Access control for paid features  
* Subscription prompts opened from locked features  
* Clear handling of active, scheduled-to-cancel, expired, and payment-failed states

### **Subscription Tiers**

| Plan | Price | Included features |
| :---- | :---- | :---- |
| Free | $0 | 18 free paths, first assessment, AI Chat, Journal |
| Pro | $29/month or yearly | All Free features, premium paths, one group session per month, reassessment |
| Premium | $79/month or yearly | All Pro features, one credit per month; two credits can be redeemed for one 30-minute 1:1 session |
| Founding Member | $19/month | Pro access for the first 12 months; available only to the first 100 eligible users; automatically converts to standard Pro at $29/month after 12 months |

Important: The yearly prices for Pro and Premium must be provided before implementation. Until confirmed, yearly pricing should be treated as TBD and must not be hard-coded based on the monthly price.

Founding Members receive the same feature access as Pro users. “Founding Member” is a pricing status, not a separate feature-access level.  
---

### **Subscription Terminology and Statuses**

The system must distinguish between the following statuses:

| Status | Description |
| :---- | :---- |
| Free | The user does not have an active paid subscription. |
| Active | The paid subscription is active and will renew automatically. |
| Scheduled to cancel | The user canceled auto-renewal, but the plan remains active until the end of the current billing period. |
| Scheduled to downgrade | A Premium user selected Pro, but Premium remains active until the end of the current billing period. |
| Past due / payment failed | Renewal payment was not completed successfully. |
| Inactive / expired | The subscription has ended and paid-plan access is no longer available. |

A scheduled cancellation or scheduled downgrade must not be treated as an immediately inactive subscription.  
---

### **Subscription Management Entry Points**

Users must be able to open the subscription screen from:

1. The landing page  
2. The user’s account or subscription settings  
3. A locked premium feature  
4. The reassessment button  
5. A locked premium path  
6. The “Book group session” button  
7. The “Book 1:1 session” button  
8. Any other paid feature that the user’s current plan does not include

The subscription screen should open as either:

* A full subscription management screen when opened from account settings or the landing page  
* A contextual upgrade pop-up when opened from a locked feature

---

### **Subscription Screen — General Requirements**

The subscription screen must display:

* Available plans  
* Monthly/yearly billing selector, where applicable  
* Price for each plan  
* Included features for each plan  
* The user’s current plan  
* Current billing frequency  
* Next renewal date  
* Expiration date if cancellation is scheduled  
* Effective date if a downgrade is scheduled  
* Available actions for each plan  
* The user’s current Premium credit balance, if applicable

The current plan must always be clearly identified with the label: “**Current plan”**  
Only actions valid for the user’s current subscription state should be enabled.  
The Free plan must not have a selectable button when the user has an active Pro or Premium subscription. Cancellation is the method used to return to Free.  
---

### **Free User State**

When the current user is on the Free plan:  
Free plan card

* Show: Current plan  
* Do not show a renewal date  
* Do not show a cancellation button

Pro plan card

* Show the Pro price and features  
* Button: Upgrade to Pro

Premium plan card

* Show the Premium price and features  
* Button: Upgrade to Premium

The user must be able to upgrade directly from Free to either Pro or Premium.  
Subscription screen actions

| Plan card | Label/action |
| :---- | :---- |
| Free | Current plan |
| Pro | Upgrade to Pro |
| Premium | Upgrade to Premium |

---

### **Free User — Locked Feature Behavior**

When a Free user clicks a locked feature, open a contextual subscription pop-up.  
The pop-up should show only the plans that provide access to the selected feature.  
Premium paths  
Show Pro and Premium because both plans include premium paths.  
Reassessment  
Show Pro and Premium because both plans include reassessment.  
Book group session  
Show Pro and Premium because both plans include group sessions.  
Book 1:1 session  
Show only Premium because Premium is the only plan that includes monthly credits and 1:1 session booking.  
The pop-up must explain why the feature is locked.  
Premium path message  
Upgrade to Pro or Premium to unlock this path and access the full premium path library.  
Reassessment message  
Upgrade to Pro or Premium to complete your reassessment and review your progress.  
Group session message  
Upgrade to Pro or Premium to access one group session per month.  
1:1 session message  
Upgrade to Premium to earn monthly credits and book 30-minute 1:1 sessions. Two credits are required for one session.  
---

### **Pro User State**

When the user has an active Pro subscription:  
Pro plan card

* Show: Current plan  
* Show billing frequency: Monthly or Yearly  
* Show: Next renewal date: \[Date\]  
* Button: Cancel subscription

Premium plan card

* Button: Upgrade to Premium

Free plan card

* No button  
* The card may remain visible for comparison purposes

Subscription screen actions

| Plan card | Label/action |
| :---- | :---- |
| Free | No action |
| Pro | Current plan / Cancel subscription |
| Premium | Upgrade to Premium |

---

### Pro User — Locked Feature Behavior

A Pro user already has access to:

* Premium paths  
* Reassessment  
* Group sessions

A Pro user does not have access to Premium credits or 1:1 session booking.  
When a Pro user clicks the “Book 1:1 session” button:

* Open a contextual upgrade pop-up  
* Show only the Premium plan  
* Button: Upgrade to Premium

Pop-up title  
Unlock 1:1 Sessions  
Message  
Upgrade to Premium to earn one credit every month. Two credits can be redeemed for one 30-minute 1:1 session.  
Buttons

* Not now  
* Upgrade to Premium

---

### Premium User State

When the user has an active Premium subscription:  
Premium plan card

* Show: Current plan  
* Show billing frequency: Monthly or Yearly  
* Show: Next renewal date: \[Date\]  
* Show: Available credits: \[Number\]  
* Button: Cancel subscription

Pro plan card

* Button: Downgrade to Pro

Free plan card

* No button

Subscription screen actions

| Plan card | Label/action |
| :---- | :---- |
| Free | No action |
| Pro | Downgrade to Pro |
| Premium | Current plan / Cancel subscription |

Premium users must not see upgrade prompts when opening Premium features.  
---

### **Founding Member State**

Founding Member is a discounted Pro subscription.  
When the user has an active Founding Member subscription, the subscription screen must display:

* Label: Founding Member  
* Secondary label: Includes Pro access  
* Price: $19/month  
* Start date  
* Discount expiration date  
* Standard price after the discount ends  
* Next renewal date  
* Button: Cancel subscription

Pricing notice  
Your Founding Member price is valid for your first 12 months. On \[Date\], your subscription will automatically continue as Pro at $29/month.

The Premium card must show:

* Button: Upgrade to Premium

The user must not be able to switch from Founding Member to standard Pro while the Founding Member offer remains active because both subscriptions provide the same features.  
If a Founding Member upgrades to Premium:

* The upgrade takes effect immediately  
* The remaining Founding Member balance is prorated  
* The Founding Member discount is permanently forfeited  
* Downgrading later must move the user to standard Pro at the current standard Pro price  
* The user must not be able to restore the Founding Member price

This consequence must be clearly shown before the upgrade is confirmed.  
---

### **Founding Member Upgrade Pop-up**

Title  
Upgrade to Premium?  
Message  
You’ll get immediate access to Premium features, including monthly credits for 1:1 sessions. The unused balance from your current billing period will be applied to your Premium subscription.  
By upgrading, you will permanently give up your Founding Member price. If you downgrade later, you will move to the standard Pro plan at the current Pro price.  
Buttons

* Keep Founding Member  
* Continue to Premium

---

### **Premium Credit System**

Premium users receive one credit per billing month.  
Credit rules:

1. One credit is added after a successful Premium subscription payment.  
2. Two credits can be redeemed for one 30-minute 1:1 session.  
3. Credits accumulate if they are not used.  
4. Credits carry over while the Premium subscription remains active.  
5. Credits cannot be transferred to another user.  
6. Credits cannot be exchanged for cash.  
7. Credits cannot be purchased separately unless this is added as a future requirement.  
8. Credits must only be added once per successful billing period.  
9. Failed, duplicate, refunded, or reversed payments must not create duplicate credits.  
10. Booking must redirect the user to Wix Bookings.  
11. The user must have at least two available credits to complete a credit-based booking.  
12. Two credits must be deducted only after the booking is successfully confirmed.  
13. If booking is not completed, the credits must not be deducted.  
14. If a booking is canceled, credit restoration must follow the configured booking cancellation policy.  
15. Credits become unusable when the Premium subscription becomes inactive.  
16. Credits are not transferred to Pro after a downgrade takes effect.  
17. Credits are permanently lost when a downgrade to Pro becomes effective.  
18. Resuming Premium before the subscription expires preserves the existing credit balance.

---

### **Premium Credit Display**

Premium users must be able to see:

* Current available credit balance  
* Number of credits needed for a 1:1 session  
* Next credit date  
* Whether the subscription is scheduled to cancel or downgrade  
* The date on which unused credits will expire

Example:  
Available credits: 3  
Two credits \= one 30-minute 1:1 session  
Your next credit will be added on \[Date\].  
If cancellation or downgrade is scheduled:  
Your unused credits will expire on \[Date\] unless you resume your Premium subscription.  
---

### **1:1 Session Booking States**

Premium user with two or more credits  
Button:  
Book a 1:1 Session  
Helper text:  
Two credits will be used after your booking is confirmed.  
The user is redirected to Wix Bookings.  
Premium user with fewer than two credits  
Button:  
Not enough credits  
Helper text:  
You currently have \[Number\] credit(s). Two credits are required to book one 30-minute 1:1 session.  
The booking button must be disabled unless Wix Bookings supports showing available dates before credit validation.  
Pro or Free user  
Button:  
Unlock 1:1 Sessions  
Clicking it opens the Premium upgrade pop-up.  
Inactive user with accumulated credits  
The credits must not be redeemable.  
Message:  
Your credits are no longer available because your Premium subscription is inactive.  
---

### **Pro Cancellation Flow**

When an active Pro user clicks Cancel subscription, open a confirmation pop-up.  
Title  
Cancel Pro Subscription?  
Message  
Are you sure? You will lose access to Pro features at the end of your current billing period on \[Date\]. You can continue using your Pro benefits until then.  
Buttons

* Keep Pro  
* Cancel Subscription

If the user confirms:

* Disable automatic renewal  
* Do not immediately remove Pro access  
* Keep the subscription active through \[Date\]  
* Change the subscription status to Scheduled to cancel  
* Show a cancellation confirmation  
* Replace the cancellation button with Resume subscription

Success message  
Your Pro subscription has been canceled. You’ll continue to have access to Pro features until \[Date\].  
---

### **Premium Cancellation Flow**

When an active Premium user clicks Cancel subscription, open a confirmation pop-up.  
Title  
Cancel Premium Subscription?  
Message  
Are you sure? You will lose access to Premium features and your unused 1:1 session credits at the end of your current billing period on \[Date\]. You can continue using your Premium benefits and credits until then.  
Buttons

* Keep Premium  
* Cancel Subscription

If the user confirms:

* Disable automatic renewal  
* Do not immediately remove Premium access  
* Allow the user to use eligible Premium features through \[Date\]  
* Keep credits available through \[Date\]  
* Change the subscription status to Scheduled to cancel  
* Show a cancellation confirmation  
* Replace the cancellation button with Resume subscription  
* Display the date on which unused credits will expire

Success message  
Your Premium subscription has been canceled. You’ll continue to have access to Premium features and your unused credits until \[Date\].  
---

### **Founding Member Cancellation Flow**

When a Founding Member clicks Cancel subscription, open a confirmation pop-up.  
Title  
Cancel Founding Member Subscription?  
Message  
Are you sure? You will lose access to Pro features at the end of your current billing period on \[Date\]. If your subscription expires, your Founding Member price cannot be restored.  
Buttons

* Keep Membership  
* Cancel Subscription

If confirmed:

* The subscription remains active until \[Date\]  
* The Founding Member price remains available only if the user resumes before \[Date\]  
* After expiration, the user returns to Free  
* The Founding Member offer cannot be restored after expiration

Success message  
Your Founding Member subscription has been canceled. You’ll continue to have Pro access until \[Date\].  
---

### **Scheduled Cancellation State**

After cancellation is confirmed, the current plan card must show:

* Current plan  
* Canceled  
* Active until \[Date\]  
* Button: Resume subscription

The system must not show Next renewal date because the subscription is no longer scheduled to renew.  
For Premium users, also show:  
Your unused credits will expire on \[Date\].  
Examples:  
Pro  
Current plan  
Canceled — active until \[Date\]  
Premium  
Current plan  
Canceled — active until \[Date\]  
Available credits: \[Number\]  
Unused credits expire on \[Date\]  
---

### **Resume Subscription Flow**

A user can resume a subscription only while it is scheduled to cancel and has not yet expired.  
When the user clicks Resume subscription, open a confirmation pop-up.  
Title  
Resume \[Plan Name\] Subscription?  
Message  
Welcome back\! Resuming will restore automatic renewal for your \[Plan Name\] subscription. Your current benefits will continue without interruption, and your billing cycle will continue as normal.  
For Premium users, add:  
Your accumulated credits will remain available while your Premium subscription is active.  
For Founding Members, add:  
Resuming before your subscription expires will preserve your Founding Member price.  
Buttons

* Not now  
* Yes, Resume

If confirmed:

* Remove the scheduled cancellation  
* Restore automatic renewal  
* Keep the existing billing cycle  
* Keep the current renewal date  
* Change status from Scheduled to cancel to Active  
* Do not charge the user immediately unless required by the payment provider  
* Preserve Premium credits  
* Show a confirmation message

Success message  
Your \[Plan Name\] subscription has been resumed. Your next renewal date is \[Date\].  
---

### **Free-to-Pro Upgrade Flow**

When a Free user clicks Upgrade to Pro, show the Pro checkout flow.  
The checkout must display:

* Selected plan  
* Monthly/yearly option  
* Price  
* Billing frequency  
* Included features  
* Amount due today  
* Renewal date  
* Auto-renewal notice

Confirmation title  
Upgrade to Pro  
Message  
Get access to premium paths, one group session per month, and reassessment. Your Pro benefits will begin immediately after your payment is confirmed.  
Buttons

* Back  
* Continue to Payment

After successful payment:

* Change the user’s plan to Pro  
* Unlock Pro features immediately  
* Save the selected billing frequency  
* Show the next renewal date

Success message  
Welcome to Pro\! Your Pro features are now available.  
---

### Free-to-Premium Upgrade Flow

When a Free user clicks Upgrade to Premium, show the Premium checkout flow.  
Confirmation title  
Upgrade to Premium  
Message  
Get full access to Pro features and earn one credit every month. Two credits can be redeemed for one 30-minute 1:1 session. Your Premium benefits will begin immediately after your payment is confirmed.  
Buttons

* Back  
* Continue to Payment

After successful payment:

* Change the user’s plan to Premium  
* Unlock Premium features immediately  
* Add the first credit only after payment is successfully confirmed  
* Show the current credit balance  
* Show the next credit date  
* Show the next renewal date

Success message  
Welcome to Premium\! Your Premium features are now available, and one credit has been added to your account.  
---

### Pro-to-Premium Upgrade Flow

A Pro-to-Premium upgrade takes effect immediately.  
The system must:

1. Calculate the unused value of the current Pro billing period.  
2. Apply that amount toward the Premium charge.  
3. Display the final amount due before confirmation.  
4. Charge the prorated upgrade amount.  
5. Activate Premium immediately after successful payment.  
6. Add one Premium credit after the upgrade payment is confirmed.  
7. Start Premium billing according to the payment provider’s proration configuration.  
8. Prevent duplicate credits if the payment callback is received more than once.

Pop-up title  
Upgrade to Premium  
Message  
Unlock 1:1 sessions and all Premium features immediately. We’ll prorate your current Pro subscription and apply the remaining balance toward your new Premium plan.  
The confirmation must display:

* Current plan  
* New plan  
* Remaining Pro balance  
* Premium price  
* Amount due today  
* New billing or renewal date

Buttons

* Keep Pro  
* Confirm Upgrade

Success message  
You’re now a Premium member. Your Premium features are available immediately, and one credit has been added to your account.  
If payment fails:

* Keep the user on Pro  
* Do not unlock Premium  
* Do not add a credit  
* Show an error message

Payment failure message  
We couldn’t complete your upgrade. Your Pro subscription is still active, and you have not been charged. Please check your payment method and try again.  
---

### Premium-to-Pro Downgrade Flow

A Premium-to-Pro downgrade must take effect at the end of the current billing period, not immediately.  
The user must:

* Keep Premium access until \[Date\]  
* Keep the ability to use accumulated credits until \[Date\]  
* Stop receiving Premium credits after the downgrade takes effect  
* Lose all remaining Premium credits when the downgrade takes effect  
* Automatically transition to Pro on \[Date\]  
* Be charged the Pro price at the next renewal according to the selected billing frequency

The user must not receive an immediate refund for the unused Premium period because Premium access remains active until the end of that period.  
Pop-up title  
Downgrade to Pro?  
Message  
Your Premium plan will remain active until the end of your current billing period on \[Date\]. On that date, your account will move to Pro, and you will lose access to 1:1 session booking and any unused credits.  
Buttons

* Keep Premium  
* Confirm Downgrade

After confirmation:

* Mark the downgrade as scheduled  
* Keep Premium as the current active plan through \[Date\]  
* Show the future Pro plan and effective date  
* Replace Downgrade to Pro with Keep Premium or Cancel downgrade

Success message  
Your downgrade is scheduled. You’ll keep Premium access and can use your credits until \[Date\]. Your Pro subscription will begin on \[Date\].  
---

### Scheduled Downgrade State

When a Premium-to-Pro downgrade is scheduled, the Premium card must show:  
Current plan  
Premium active until \[Date\]  
Downgrade to Pro scheduled for \[Date\]  
Also display:  
Available credits: \[Number\]  
Unused credits will expire on \[Date\].  
Button:  
Keep Premium  
The Pro card must show:  
Your Pro plan will begin on \[Date\].  
The user must not be able to schedule both a cancellation and a downgrade at the same time.  
---

### Cancel Scheduled Downgrade Flow

When the user clicks Keep Premium, open a confirmation pop-up.  
Title  
Keep Premium?  
Message  
Your scheduled downgrade will be canceled. Your Premium subscription will continue and renew as normal on \[Date\].  
Buttons

* Back  
* Yes, Keep Premium

After confirmation:

* Remove the scheduled downgrade  
* Keep Premium active  
* Restore the normal Premium renewal state  
* Preserve the user’s credits  
* Continue monthly credit accrual

Success message  
Your downgrade has been canceled. Your Premium subscription will continue as normal.  
---

### Subscription Expiration

When a scheduled cancellation reaches the end of the billing period:  
Pro or Founding Member

* Change the user to Free  
* Remove access to Pro features  
* Remove access to premium paths  
* Remove access to reassessment  
* Remove access to group-session booking  
* Change the subscription status to inactive  
* Show upgrade options on the subscription screen

Premium

* Change the user to Free  
* Remove Pro and Premium access  
* Disable 1:1 session booking  
* Make all unused credits unavailable  
* Stop future credit accrual  
* Change the subscription status to inactive  
* Show upgrade options on the subscription screen

The user’s historical subscription and credit transactions should remain available for internal reporting, even though credits are no longer usable.  
---

### Payment Failure State

If a renewal payment fails:

* Do not add a new Premium credit  
* Display a payment issue notification  
* Ask the user to update the payment method  
* Follow the payment provider’s retry and grace-period (14 day for yearly subscription, 7 days for monthly subscription) rules  
* Do not immediately downgrade the user unless the configured grace period has ended  
* If payment recovery fails and the subscription becomes inactive, remove paid access and make Premium credits unavailable

Subscription screen message  
We couldn’t process your latest payment. Please update your payment method to avoid losing access to your subscription benefits.  
Button  
Update Payment Method  
After successful recovery:  
Your payment method has been updated, and your subscription is active.  
---

### Feature Access Rules

The system must validate access on both the user interface and backend.  
Hiding or locking a button in the interface is not sufficient. The backend must verify the user’s active entitlement before allowing access to:

* Premium paths  
* Reassessment  
* Group-session booking  
* Premium credit accrual  
* 1:1 session booking  
* Credit redemption

Access checks must use the effective subscription status and date.  
A user with a scheduled cancellation still has paid access until the expiration date.  
A user with a scheduled downgrade still has Premium access until the downgrade date.  
An inactive or expired user must not access paid features even if an old interface session still shows them as available.  
---

### Loading and Duplicate-Action Prevention

When a subscription action is being processed:

* Disable the confirmation button  
* Show a loading state  
* Prevent duplicate checkout requests  
* Prevent duplicate cancellation or resume requests  
* Prevent duplicate credits  
* Prevent the same booking from deducting credits more than once

Example loading labels:

* Upgrading…  
* Canceling…  
* Resuming…  
* Scheduling downgrade…  
* Processing payment…

---

### Error Messages

Generic action error  
We couldn’t update your subscription. Please try again.  
Payment error  
We couldn’t process your payment. Please check your payment method and try again.  
Cancellation error  
We couldn’t cancel your subscription. Your current plan is still active. Please try again.  
Resume error  
We couldn’t resume your subscription. Please try again before your subscription expires on \[Date\].  
Downgrade error  
We couldn’t schedule your downgrade. Your Premium subscription has not been changed.  
Booking redirect error  
We couldn’t open session booking. Your credits have not been deducted. Please try again.  
Insufficient credits  
You need two credits to book a 30-minute 1:1 session. You currently have \[Number\] credit(s).  
---

### Date and Price Display Requirements

Dates must use the user’s selected locale and time zone.  
Examples:

* Next renewal date: April 15, 2026  
* Canceled — active until April 15, 2026  
* Downgrade to Pro scheduled for April 15, 2026

All checkout and confirmation screens must clearly display:

* Currency  
* Amount due today  
* Tax, if applicable  
* Credit or prorated balance  
* Billing frequency  
* Next renewal amount  
* Next renewal date

The final payment amount must come from the payment provider and must not be calculated only on the frontend.  
---

### Subscription Management Card Descriptions

**Free**

| ✔  Complete PuP 360 diagnostic — all 16 questions, full classification ✔  7 AI coaching sessions per month ✔  3 Free-tier guided coaching paths ✔  All 6 deep-dive assessment modules ✔  Personalized dashboard with classification, scores, focus areas ✔  Recovery mode and grief mode — always active when flagged ✔  Crisis resources accessible in one tap at all times ✔  Basic milestone tracking ✔  Daily check-in (Phase 2 — available all tiers) ✖  Unlimited sessions ✖  Pro or Premium paths ✖  Session memory system ✖  Reassessment ✖  Group or 1:1 coaching ✖  AI journal reflection ✖  PDF report |
| :---- |

 

**Pro**

| ✔  Everything in Free ✔  Unlimited AI coaching sessions — no monthly cap ✔  All 40+ Free and Pro guided coaching paths ✔  Full relational memory system — AI remembers across sessions ✔  Session continuity — AI references prior sessions naturally ✔  90-day reassessment — automatic trigger at day 90 ✔  Score comparison, classification update, trajectory statement ✔  4 optional progress reflection questions (path-adaptive) ✔  Basic PuP 360 PDF summary at reassessment — 1-2 pages ✔  AI journal reflection — share an entry, receive a coaching response ✔  Daily check-in with streak tracking and dashboard widget ✔  Coaching insights feed — 3 personalized articles daily ✔  Path and recovery milestone recognition with AI acknowledgment ✔  Group coaching access — $97/month add-on, one cohort at a time ✖  On-demand reassessment (90-day cycle only) ✖  Sub-dimension score breakdown ✖  Full Premium PDF report ✖  1:1 sessions with PuP coaching team ✖  Behavioral fingerprint reveal ✖  Premium-only paths (all 55\) |
| :---- |

**Premium**

## 

| ✔  Everything in Pro ✔  All 55 guided coaching paths including Premium-only content ✔  On-demand reassessment — any time after day 30 ✔  Sub-dimension score breakdown for each of the three dimensions ✔  Full PuP 360 PDF diagnostic report — 4-6 pages at every reassessment ✔  Behavioral fingerprint revealed in PDF — the only place it appears ✔  Score trend history across all assessments taken ✔  Complete path completion history and coaching summary in PDF ✔  Access to the PuP coaching team for 1:1 sessions ✔  Coach matched by classification, sub-mode, and flag status ✔  Booking via Wix Bookings — redirected from app with context ✔  Priority access to new paths and features before general release |
| :---- |

---

### Acceptance Criteria

1. A Free user can upgrade directly to Pro or Premium.  
2. A Free user sees only relevant plans when opening a subscription prompt from a locked feature.  
3. A Pro user can upgrade to Premium immediately.  
4. The unused Pro balance is applied to a Pro-to-Premium upgrade.  
5. Premium access begins only after successful payment confirmation.  
6. One credit is added after a successful Premium activation or Premium renewal.  
7. Duplicate payment notifications do not add duplicate credits.  
8. A Premium user can schedule a downgrade to Pro.  
9. A downgrade takes effect at the end of the current billing period.  
10. A Premium user keeps access and credits until the downgrade effective date.  
11. Unused credits become unavailable when the downgrade takes effect.  
12. Pro, Premium, and Founding Members can cancel their subscriptions.  
13. Cancellation stops automatic renewal but does not immediately remove access.  
14. A scheduled-to-cancel user sees Active until \[Date\].  
15. A scheduled-to-cancel user can resume before expiration.  
16. Resuming preserves the existing billing cycle and active benefits.  
17. Resuming Premium preserves accumulated credits.  
18. An expired paid subscription automatically transitions to Free.  
19. Premium credits become unusable after the Premium subscription becomes inactive.  
20. Two credits are deducted only after a 1:1 booking is successfully confirmed.  
21. Credits are not deducted if the user does not complete the booking.  
22. Founding Member availability is limited to the first 100 eligible users.  
23. Founding Member pricing automatically converts to standard Pro pricing after 12 months.  
24. A Founding Member is warned that upgrading permanently removes the discounted price.  
25. Payment failures do not incorrectly activate paid features or add credits.  
26. All plan changes display the effective date and financial impact before confirmation.  
27. Subscription actions are protected against duplicate submissions.  
28. Paid-feature access is validated by the backend, not only by the interface.

---

