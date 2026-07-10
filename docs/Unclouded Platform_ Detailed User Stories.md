# **Unclouded Platform: Detailed User Stories**

This document provides a comprehensive set of user stories derived directly from the Product Requirements Document (PRD). Each story follows the standard format: As a \[persona\], I want to \[action\], so that \[benefit\]. Acceptance criteria are included to define what "done" means for each story.

---

## **Phase 1 Foundation (Zero-Cost Baseline)**

*These features are already implemented and functional. They will be rebuilt as part of the core application foundation.*

### **Registration & Authentication**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| US-001 | As a new user, I want to create an account using my email and password, so that I can access the Unclouded platform. | \- User can navigate to a sign-up page. \- User can enter email, password, and confirm password. \- Account is created in the database. \- User is automatically logged in after successful sign-up. |
| US-002 | As a returning user, I want to log in to my existing account, so that I can access my personalized data and continue my journey. | \- User can navigate to a login page. \- User can enter email and password. \- Correct credentials grant access to the dashboard. \- Incorrect credentials display an error message. |
| US-003 | As a user, I want to log out of my account, so that my data remains secure on shared devices. | \- A logout button is available in the app. \- Clicking logout ends the user's session and redirects to the login page. |

### **PuP 360 Onboarding Assessment**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| US-004 | As a new user, I want to complete the 12-screen PuP 360 Assessment during my account setup, so that I can receive a personalized behavioral profile. | \- Assessment is presented as a 12-step wizard. \- Each screen contains relevant questions. \- User can navigate forward and backward between screens. \- All responses are saved to the user's record upon completion. |
| US-005 | As a user, I want my assessment responses to be processed by the Classification & Scoring Engine, so that I can receive accurate classification results. | \- Upon assessment completion, the engine processes responses. \- Scores are calculated across six dimensions. \- A classification is generated and stored on the user's record. \- Processing completes without error. |

### **Results & Classification**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| US-006 | As a user, I want to view my PuP 360 assessment results, so that I can understand my behavioral profile. | \- Results screen displays the user's PuP 360 score. \- Classification type is clearly shown. \- A personalized summary is generated based on the results. |
| US-007 | As a user, I want my assessment results to be securely stored, so that they can be used for future coaching and tracking. | \- Results data is stored in the database. \- Data is accessible only to the authenticated user. \- Results can be referenced by the AI coaching engine. |

### **Journal**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| US-008 | As a user, I want to create journal entries, so that I can document my thoughts and progress. | \- A journal page exists. \- User can write and save a new journal entry. \- Entry is timestamped and stored in the user's journal collection. |
| US-009 | As a user, I want to edit my journal entries, so that I can refine my notes over time. | \- User can open an existing journal entry. \- User can modify the content and save changes. \- Updated entry reflects the edit timestamp. |
| US-010 | As a user, I want to delete journal entries, so that I can remove outdated or irrelevant notes. | \- User can delete an existing journal entry. \- A confirmation dialog is shown before deletion. \- Deleted entry is removed from the user's journal collection. |
| US-011 | As a user, I want to view my list of journal entries, so that I can browse my past reflections. | \- Journal list displays all entries for the authenticated user. \- Entries are sorted by date (newest first). \- User can click an entry to view its full content. |

### **Guided Paths**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| US-012 | As a user, I want to be automatically assigned to relevant Guided Paths after onboarding, so that I can start my development journey. | \- Paths are assigned based on classification and assessment results. \- Assigned paths appear in the user's dashboard. \- Path assignment logic is consistent and accurate. |
| US-013 | As a user, I want to work through Guided Path sessions, so that I can complete structured development modules. | \- Each path contains multiple sessions. \- Sessions include educational content and coaching content. \- Three reflection questions are presented per session. \- User can submit responses to reflection questions. |
| US-014 | As a user, I want to select and track micro-commitments within my paths, so that I can take actionable steps toward my goals. | \- Path sessions include action-oriented micro-commitments. \- User can select micro-commitments to adopt. \- Selected commitments are added to the user's active commitment tracker. |
| US-015 | As a user, I want my path progress to be tracked, so that I can see my advancement and pick up where I left off. | \- Progress is saved for each path session. \- User can resume a path from the last completed session. \- Progress can be referenced by the AI coaching engine. |

---

## **Phase 2 Features (Paid Scope)**

### **1\. Core User Experience**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-100 | As a first-time user, I want to see a welcoming dashboard after login, so that I understand the platform's key areas and what to do next. | \- Dashboard displays onboarding completion status. \- Recommended next steps are prominently shown. \- No empty or placeholder states appear. | Must Have |
| US-101 | As a returning user, I want to see my current progress, daily check-in status, active paths, and key metrics on the dashboard, so that I can quickly assess my status. | \- Dashboard aggregates data from onboarding, check-ins, and paths. \- Key metrics (streak, sessions completed, active paths) are visible. \- Progress indicators are clear and actionable. | Must Have |
| US-102 | As a user, I want to access the Settings area, so that I can manage my account and application preferences. | \- A settings page exists. \- User can view current settings. \- User can update values via forms and toggles. \- Changes are saved successfully. \- Settings are consistently applied across the app. | Must Have |
| US-103 | As a user, I want the application to have a polished visual design, so that I have a professional and trustworthy experience. | \- All UI elements are consistent with design system. \- No placeholder text appears anywhere in the live app. \- Visual display is refined and aesthetically pleasing. | Should Have |

### **2\. Subscriptions, Billing & Enterprise**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-200 | As a Free user, I want to see what the Pro and Premium plans offer, so that I can decide if I want to upgrade. | \- Pricing and feature comparison is displayed. \- Upgrade paths are clear and accessible. \- Free users see their session limit (7/month). | Must Have |
| US-201 | As a Free user, I want to upgrade to a Pro or Premium plan, so that I can access unlimited sessions and premium features. | \- Checkout flow captures payment information. \- Subscription is activated and reflected in the user's account. \- User receives a confirmation email. | Must Have |
| US-202 | As a user, I want my Pro plan to automatically renew monthly, so that I have uninterrupted access. | \- Recurring billing is handled by Stripe. \- Failed payments trigger a notification and retry logic. \- Subscription status remains accurate. | Must Have |
| US-203 | As a Founding Member, I want to lock in a $19/month Pro subscription permanently, so that I receive the founding member benefit. | \- First 200 users or signups within 90 days qualify. \- Founding Members see $19/month charge. \- Rate is locked for the life of the subscription. | Must Have |
| US-204 | As a Premium user, I want to book 1:1 coaching sessions with the PuP coaching team, so that I can receive personalized coaching. | \- Premium users see a booking page. \- Available coaches and times are displayed. \- Bookings are confirmed and synced with Wix Bookings. | Must Have |
| US-205 | As an Enterprise user, I want to access the platform without seeing pricing screens or upgrade prompts, so that I can have a seamless experience. | \- Enterprise users bypass all billing screens. \- No upgrade prompts are shown. \- Session limits are removed. | Must Have |
| US-206 | As an Enterprise Admin (HR), I want to generate enrollment codes for my organization, so that employees can sign up and get access. | \- Admin dashboard has enrollment code management. \- Codes can be created, tracked, and deactivated. \- Employees can enter a code during sign-up. | Must Have |
| US-207 | As a Dr. Sam/Admin, I want to see active seat count versus purchased seat count for each organization, so that I can monitor enterprise usage. | \- Admin dashboard shows seat usage per organization. \- Flat rate organizations show fixed seats. \- Usage-based organizations show active seats tracked monthly. | Must Have |
| US-208 | As a Dr. Sam/Admin, I want to run a report showing active users per organization for a given month, so that I can reconcile billing manually. | \- A report generation tool is available. \- Report shows active users per organization for a selected month. \- Report can be exported. | Should Have |

### **3\. Coaching, Content & Assessment**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-300 | As a subscribed user, I want to be notified when I'm eligible for the 90-Day Reassessment, so that I can track my progress over time. | \- Notification appears on dashboard at day 90\. \- User can initiate reassessment. \- Reassessment questionnaire is presented. | Must Have |
| US-301 | As a subscribed user, I want to complete the 90-Day Reassessment questionnaire, so that I can see how my scores have changed. | \- 16 scored questions are presented. \- 4 optional progress reflection questions are offered. \- Results are calculated and stored. | Must Have |
| US-302 | As a user, I want to automatically receive a downloadable PDF report after completing my reassessment, so that I can review my detailed results offline. | \- PDF is generated automatically upon completion. \- Report contains templated data and AI-generated narrative. \- A download link appears on the dashboard and results screen. | Must Have |
| US-303 | As a user, I want the PDF report to include my assessment scores, classification, and personalized narrative, so that I have a comprehensive view of my progress. | \- Templated sections display scores and metrics. \- AI-generated narrative is personalized to the user's context. \- Report is professionally formatted. | Must Have |
| US-304 | As a Dr. Sam/Admin, I want to create and load 37 new Phase 2 paths via the admin interface, so that users have fresh content. | \- Content editor allows creating path sessions. \- Paths can be assigned to relevant users based on data. \- New paths are available immediately. | Must Have |
| US-305 | As a user, I want my path responses to be used in my next AI coaching session, so that the coaching feels continuous and informed. | \- PathResponse answers are stored. \- The AI session prompt includes recent path reflection answers. \- The AI acknowledges and references path work. | Should Have |
| US-306 | As a user, I want the AI to end coaching sessions with a synthesis and ending statement, so that sessions feel complete and professional. | \- AI initiates session end with a summary. \- A clear ending statement is provided. \- User is not left wondering if the session is over. | Should Have |
| US-307 | As a user, I want the AI to be aware of the session's length and pacing, so that sessions are appropriately timed. | \- Exchange count is passed to the AI. \- The AI adjusts responses based on session stage. \- Sessions feel naturally paced. | Should Have |

### **4\. Content & Engagement**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-400 | As a user, I want to complete a daily check-in, so that I can track my emotional state and commitments. | \- Check-in UI captures pulse score (1-10). \- User can select a feeling word. \- User can indicate commitment status. \- Check-in data is stored. | Must Have |
| US-401 | As a user, I want to see my check-in streak on the dashboard, so that I stay motivated to maintain it. | \- Streak tracking is calculated and displayed. \- Streak increments with each daily check-in. \- Streak resets after a missed day. | Should Have |
| US-402 | As a user, I want my check-in data to be used by the AI at the start of my next session, so that the coaching is responsive to my current state. | \- Check-in data feeds into the AI's live signals block. \- AI acknowledges recent check-in data. \- Coaching adapts based on check-in signals. | Must Have |
| US-403 | As a user, I want to read 3 fresh, personalized articles in my Insights Feed daily, so that I receive relevant educational content. | \- Articles are tagged by classification, pillar, and nervous system. \- Matching logic selects relevant articles for the user. \- Articles rotate to avoid repeats. \- 3 new articles appear daily. | Should Have |
| US-404 | As a Dr. Sam/Admin, I want to publish and tag articles via the admin interface, so that I can manage the Insights Feed. | \- Content editor for articles exists. \- Articles can be tagged with classification, pillar, and nervous system. \- Published articles appear in users' feeds. | Must Have |
| US-405 | As a user, I want to write a journal entry and receive an AI-generated reflection in response, so that I gain deeper insights into my thoughts. | \- Journal includes an option for "AI Reflection." \- AI responds to the journal entry with personalized insights. \- The AI reflection is saved alongside the journal entry. | Should Have |
| US-406 | As a user, I want to see key milestones (24hr, 1yr recovery) acknowledged by the AI, so that I feel recognized for my progress. | \- `days_since_recovery_start` field is tracked on the User record. \- AI acknowledges milestones with personalized language. \- Milestone triggers are correctly timed. | Should Have |
| US-407 | As a user, I want to be acknowledged when I complete a Path, so that I feel a sense of accomplishment. | \- Path completion is tracked and triggers an acknowledgment. \- The AI acknowledges path completion at the next session. \- A notification or visual indicator is displayed. | Should Have |

### **5\. Admin & Operations**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-500 | As a Dr. Sam/Admin, I want a comprehensive Admin Dashboard with 7 tabs, so that I can manage all aspects of the platform efficiently. | \- Admin Dashboard has 7 functional tabs. \- Tabs include: Content Editor, Safety Event Queue, User Management, Reassessment Results, Organization Management, Pre-session Coaching Brief, and Reports. \- Navigation between tabs is seamless. | Must Have |
| US-501 | As a Dr. Sam/Admin, I want to edit path sessions via a content editor, so that I can update content without needing a developer. | \- Content editor is intuitive and user-friendly. \- Path sessions can be edited, saved, and published. \- Changes are immediately reflected for users. | Must Have |
| US-502 | As a Dr. Sam/Admin, I want to monitor a Safety Event Queue, so that I can respond to safety-related events quickly. | \- Safety events are logged in the queue. \- Level 3+ events trigger an email alert. \- Events can be reviewed and acknowledged. | Must Have |
| US-503 | As a Dr. Sam/Admin, I want to view all user fields and data in the admin, so that I can manage users effectively. | \- User management tab displays all user fields. \- Users can be searched and filtered. \- User data is read-only to prevent accidental changes. | Must Have |
| US-504 | As a Dr. Sam/Admin, I want to view reassessment results for each user (read-only), so that I can track progress and identify trends. | \- Reassessment results are visible per user. \- Results are read-only. \- Historical results are accessible. | Should Have |
| US-505 | As a Dr. Sam/Admin, I want to manage organizations for enterprise accounts, so that I can onboard and oversee enterprise clients. | \- Organization management tab exists. \- Organizations can be created, edited, and deactivated. \- Seat counts and billing details are visible. | Must Have |
| US-506 | As a PuP Coach, I want to generate a pre-session coaching brief, so that I can prepare for 1:1 coaching sessions. | \- Brief generator is accessible to PuP Coaches. \- Brief includes user's assessment results, path progress, and recent check-ins. \- Brief is concise and actionable. | Must Have |

### **6\. Marketing & Integrations (Wix)**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-600 | As an Admin, I want `uncloud360.ai` configured as a custom domain on Bubble, so that users access the app directly. | \- Custom domain is correctly configured. \- SSL certificate is valid. \- Domain redirects to the Bubble app. | Must Have |
| US-601 | As a marketing user, I want Wix CTAs to redirect to the Bubble app with UTM parameters, so that I can track marketing campaign performance. | \- CTA links include UTM parameters. \- Parameters are captured on user sign-up. \- Attribution is stored on the User record. | Must Have |
| US-602 | As a user, I want to see the pricing page on Wix, but complete checkout on Bubble, so that I get a seamless but secure purchase experience. | \- Pricing is displayed on Wix. \- "Buy" or "Subscribe" links redirect to Bubble checkout. \- Checkout flow is secure and user-friendly. | Must Have |
| US-603 | As a Premium user, I want to book a session through the Wix Bookings page, so that I can schedule a 1:1 with a PuP coach. | \- Premium users can access Wix Bookings. \- Bubble redirects to Wix with user's first name and email pre-filled. \- Booking is confirmed and stored. | Must Have |
| US-604 | As a PuP Coach, I want to receive a coach brief when a booking is confirmed, so that I can prepare for the session. | \- Coach brief is sent automatically on booking confirmation. \- Brief includes user information and session context. \- Brief is delivered via email or admin dashboard. | Must Have |
| US-605 | As a Dr. Sam/Admin, I want completed sessions to be logged in the Bubble admin, so that I can track coaching activity. | \- Session completion triggers a log entry. \- Log includes coach, user, date, and any notes. \- Logs are visible in the admin dashboard. | Should Have |
| US-606 | As a user, I want to receive transactional emails (e.g., password reset, payment confirmations), so that I have important account information. | \- Transactional emails are sent via Bubble \+ SendGrid. \- All transactional email templates are built. \- Emails are branded and professional. | Must Have |
| US-607 | As an Admin, I want marketing emails sent via Wix Ascend or Mailchimp, so that I can manage campaigns effectively. | \- Integration with Wix Ascend or Mailchimp is configured. \- Email lists are synced with user data. \- Campaigns can be created and tracked. | Should Have |

### **7\. Mobile Application**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-700 | As a user, I want to download and use a native mobile app on iOS and Android, so that I can access Unclouded on the go. | \- Mobile app is built as a Bubble wrapper. \- App is listed on both App Store and Play Store. \- App is fully functional on iOS and Android. | Must Have |
| US-701 | As a user, I want to receive push notifications for check-ins, milestones, and new sessions, so that I stay engaged. | \- Push notifications are configured. \- Notifications are triggered for check-in reminders, milestone achievements, and new session availability. \- Notifications work on both iOS and Android. | Should Have |
| US-702 | As a user, I want all key screens to be mobile-tested, so that I have a great experience on my phone. | \- All screens are tested on iOS and Android devices. \- UI is responsive and touch-friendly. \- No functionality is lost on mobile. | Must Have |
| US-703 | As an Admin, I want developer accounts to be in the Proven Under Pressure LLC name, so that the app is properly owned. | \- Developer accounts on Apple Developer and Google Play Console are set up in the company name. \- App listings reflect the company ownership. | Must Have |
| US-704 | As an Admin, I want an in-app purchase strategy that avoids the Apple 30% fee, so that we maximize revenue. | \- Strategy is defined and implemented. \- Users are directed to web checkout for subscriptions. \- No in-app purchase flows trigger the Apple fee. | Should Have |

### **8\. Legal & Compliance**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-800 | As a user, I want to access the Privacy Policy and Terms and Conditions, so that I understand my rights and obligations. | \- Privacy Policy and Terms are linked in the Bubble app footer. \- Links navigate to the relevant pages on Wix. \- Pages are accessible and readable. | Must Have |
| US-801 | As a user, I want to see a coaching disclaimer during sign-up and in the PDF report footer, so that I understand the scope of the coaching. | \- Coaching disclaimer is displayed in the sign-up flow. \- Disclaimer appears in the footer of PDF reports. \- Language is clear and standard. | Must Have |
| US-802 | As a user, I want to request the deletion of my data, so that I can exercise my privacy rights. | \- Data deletion request feature exists in app settings. \- Request initiates the deletion process. \- User receives confirmation of deletion. | Must Have |
| US-803 | As a user with disabilities, I want to navigate the platform using a screen reader, so that I have equal access to the content. | \- WCAG 2.1 AA standards are met. \- Screen reader support is implemented. \- Color contrast requirements are met. \- Keyboard navigation is fully functional. | Should Have |

### **9\. Analytics & Referrals**

| ID | User Story | Acceptance Criteria | Priority |
| :---- | :---- | :---- | :---- |
| US-900 | As a marketing user, I want product analytics configured, so that I can understand user behavior. | \- Analytics tool (Mixpanel, Amplitude, or PostHog) is configured. \- Key events are tracked (sign-up, assessment complete, upgrade, check-in). \- Data is accessible for reporting. | Should Have |
| US-901 | As a marketing user, I want to track the conversion funnel from sign-up through paid conversion, so that I can optimize the onboarding flow. | \- Funnel tracking is implemented. \- Drop-off points are identifiable. \- Funnel data is visible in the analytics dashboard. | Should Have |
| US-902 | As a B2C Referral Partner, I want a unique referral link to share with my clients, so that I can track who I've referred. | \- ReferralPartner data type exists. \- Unique links are generated per partner. \- Referral source is captured on the User record at sign-up. | Should Have |
| US-903 | As a Dr. Sam/Admin, I want to see sign-ups and paid conversions per referral partner, so that I can measure partner effectiveness. | \- Admin view shows conversion counts per partner. \- Data is up-to-date and accurate. \- Partners can see their own stats. | Should Have |
| US-904 | As a user, I want my UTM source, medium, and campaign to be stored on my record at sign-up, so that marketing attribution is accurate. | \- UTM parameters are captured from URL. \- Parameters are stored on the User record. \- Data is available for reporting. | Should Have |
| US-905 | As a user who started onboarding but didn't finish, I want to receive a re-engagement email after 24 hours, so that I can complete my registration. | \- Automated workflow detects incomplete sign-ups. \- Email is triggered 24 hours after start. \- Email encourages completion of onboarding. | Should Have |

---

## **Summary: User Stories by Category**

| Category | Number of Stories | Must Have | Should Have |
| :---- | :---- | :---- | :---- |
| Phase 1 Foundation | 15 | 15 | 0 |
| Core Experience | 4 | 3 | 1 |
| Subscriptions & Enterprise | 9 | 7 | 2 |
| Coaching & Assessment | 8 | 5 | 3 |
| Content & Engagement | 8 | 4 | 4 |
| Admin & Operations | 7 | 6 | 1 |
| Marketing & Integrations | 8 | 6 | 2 |
| Mobile | 5 | 4 | 1 |
| Legal & Compliance | 4 | 3 | 1 |
| Analytics & Referrals | 5 | 0 | 5 |
| Total | 73 | 53 | 20 |

---

## **Notes for Development Team**

1. Priority Definitions:  
   * Must Have: Feature is essential for launch. The product cannot be shipped without it.  
   * Should Have: Feature is important but can be released in a subsequent iteration if time/budget constraints arise.  
2. Pre-requisites:  
   * All Phase 1 Foundation stories must be rebuilt and working before Phase 2 work begins.  
   * Data migration from the existing platform is required before launch.  
3. Dependencies:  
   * Third-party service accounts (Stripe, SendGrid, Anthropic, Wix) must be set up and accessible.  
   * Developer accounts for App Store and Play Store must be in the Proven Under Pressure LLC name.  
4. Testing Requirements:  
   * All user stories must pass QA testing on both web and mobile platforms.  
   * Accessibility testing is required for stories marked with WCAG compliance.

