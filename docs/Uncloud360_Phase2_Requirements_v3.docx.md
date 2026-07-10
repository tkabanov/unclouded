**Uncloud360™**

**Phase 2 — Complete Requirements and Launch Specification**

*For review with development team  ·  May 27, 2026*

| STATUS KEY ✔  DONE     ✔  CONFIRM — verify on call     □  TO DO — Phase 1 gap     ○  PHASE 2 — new feature     ?  CLARIFY     ✖  REMOVED |
| :---- |

*SECTIONS: 1 — Tier Architecture  ·  2 — 90-Day Reassessment  ·  3 — PDF Report (AI \+ Templated)  ·  4 — Full Build Checklist  ·  5 — Checkout and Billing  ·  6 — Wix Integration  ·  7 — Wix Bookings  ·  8 — Email System  ·  9 — Enterprise Accounts  ·  10 — Mobile App  ·  11 — Analytics  ·  12 — Legal and Compliance  ·  13 — Testing Plan  ·  14 — Launch Readiness Checklist  ·  15 — Questions for Call*

# **Section 1 — Tier Architecture — Complete Specification**

|  | DESIGN PRINCIPLE Free gets 7 sessions per month — enough to feel genuine value before the paywall. Pro gets unlimited sessions and is differentiated by features, not quantity. Premium is a genuinely different category: deepest diagnostics, full reporting, and access to the PuP coaching team for 1:1 sessions. |
| :---- | :---- |

## **Free — $0**

| FREE $0 / forever |
| :---- |
| **✔**  Complete PuP 360 diagnostic — all 16 questions, full classification **✔**  7 AI coaching sessions per month **✔**  3 Free-tier guided coaching paths **✔**  All 6 deep-dive assessment modules **✔**  Personalized dashboard with classification, scores, focus areas **✔**  Recovery mode and grief mode — always active when flagged **✔**  Crisis resources accessible in one tap at all times **✔**  Basic milestone tracking **✔**  Daily check-in (Phase 2 — available all tiers) ✖  Unlimited sessions ✖  Pro or Premium paths ✖  Session memory system ✖  Reassessment ✖  Group or 1:1 coaching ✖  AI journal reflection ✖  PDF report |

## **Pro — $29/month  ·  Founding Member $19/month (first 200\)**

|  | FOUNDING MEMBER First 200 members lock in at $19/month permanently. Cap: 200 users or 90 days from launch, whichever comes first. After cap, Pro is $29/month. Founding members keep $19 for life of subscription. |
| :---- | :---- |

| PRO $29 / month |
| :---- |
| **✔**  Everything in Free **✔**  Unlimited AI coaching sessions — no monthly cap **✔**  All 40+ Free and Pro guided coaching paths **✔**  Full relational memory system — AI remembers across sessions **✔**  Session continuity — AI references prior sessions naturally **✔**  90-day reassessment — automatic trigger at day 90 **✔**  Score comparison, classification update, trajectory statement **✔**  4 optional progress reflection questions (path-adaptive) **✔**  Basic PuP 360 PDF summary at reassessment — 1-2 pages **✔**  AI journal reflection — share an entry, receive a coaching response **✔**  Daily check-in with streak tracking and dashboard widget **✔**  Coaching insights feed — 3 personalized articles daily **✔**  Path and recovery milestone recognition with AI acknowledgment **✔**  Group coaching access — $97/month add-on, one cohort at a time ✖  On-demand reassessment (90-day cycle only) ✖  Sub-dimension score breakdown ✖  Full Premium PDF report ✖  1:1 sessions with PuP coaching team ✖  Behavioral fingerprint reveal ✖  Premium-only paths (all 55\) |

## **Premium — $79/month**

| PREMIUM $79 / month |
| :---- |
| **✔**  Everything in Pro **✔**  All 55 guided coaching paths including Premium-only content **✔**  On-demand reassessment — any time after day 30 **✔**  Sub-dimension score breakdown for each of the three dimensions **✔**  Full PuP 360 PDF diagnostic report — 4-6 pages at every reassessment **✔**  Behavioral fingerprint revealed in PDF — the only place it appears **✔**  Score trend history across all assessments taken **✔**  Complete path completion history and coaching summary in PDF **✔**  Access to the PuP coaching team for 1:1 sessions **✔**  Coach matched by classification, sub-mode, and flag status **✔**  Booking via Wix Bookings — redirected from app with context **✔**  Priority access to new paths and features before general release |

## **PuP Coaching Team — Premium Feature Specification**

Premium users book 1:1 coaching sessions with the Proven Under Pressure coaching team — not Dr. Sam exclusively. Dr. Sam leads and certifies the team. Coaches are matched to users based on PuP 360 data.

•  Coach matching criteria: primary classification, active pillar, sub-mode, recovery flag, grief flag

•  User taps 'Book a coaching session' in the Bubble app — redirected to Wix Bookings (see Section 7\)

•  Coach receives a pre-session brief from the admin: classification, scores, active paths, recent session context

•  After session: coach logs session in admin dashboard. Bubble record updated.

•  User may request a specific coach after a first session — honored when availability allows

•  Phase 3: PuP practitioner certification program creates the pipeline for new team coaches

•  Enterprise clients may purchase a dedicated team coach for their cohort — custom pricing

## **Enterprise — Contract Pricing**

|  | ENTERPRISE USERS Employees covered by employer contract receive Pro or Premium access with no individual billing. They never see pricing screens, upgrade prompts, or session limits. See Section 9 for full enterprise specification. |
| :---- | :---- |

# **Section 2 — 90-Day Reassessment — Full Specification**

## **Access by Tier**

| Tier | Access | Frequency | PDF |
| :---- | :---- | :---- | :---- |
| Free | No | N/A | No |
| Pro | Yes — auto trigger at day 90 | Every 90 days | Basic — 1-2 pages |
| Premium | Yes — on-demand after day 30 | Any time | Full — 4-6 pages |
| Enterprise | Per contract tier | Per tier | Per tier |

## **The Questions**

|  | CORE QUESTIONS — SAME 16 AS ONBOARDING The 16 scored questions are repeated verbatim. This is non-negotiable for clinical validity — score comparison is only meaningful when the instrument is identical. The same 6 Stability, 5 Performance, and 5 Alignment questions are asked in the same order with the same scale. |
| :---- | :---- |

After the 16 scored questions, 4 optional progress reflection questions appear. These are not scored. They feed the AI context block and the PDF report.

### **The 4 Optional Progress Reflection Questions**

| Question | What it feeds |
| :---- | :---- |
| Looking back at the past 90 days, what shifted most for you? | AI context block · PDF coaching summary |
| What are you still working on that feels unfinished? | AI unresolved threads · next path recommendations |
| What did you do differently because of your coaching sessions? | PDF behavioral evidence section |
| What do you want to focus on in the next 90 days? | Next path auto-enrollment · AI session opening |

|  | PATH-ADAPTIVE VARIANTS When a user has completed one or more full paths, one of the four questions is replaced with a path-specific version. Example for Burnout Recovery completion: 'You completed the Burnout Recovery path in these 90 days. What does recovery actually look like for you now compared to when you started?' Dr. Sam writes one path-specific variant per path. Stored in PathSession table as reassessment\_reflection\_question field on the final session of each path. |
| :---- | :---- |

## **The Results Screen**

### **Score Comparison Cards**

| Element | Specification |
| :---- | :---- |
| Original score label | '90 days ago' |
| New score label | 'Today' |
| Positive change | \+ \[N\] shown in green |
| Negative change | − \[N\] shown in amber. Copy: 'Hard seasons show up in data. This is information, not failure.' |
| No change | Gray. Copy: 'Holding steady is not nothing.' |
| Visualization | Two horizontal bars side by side — proportional to score out of 5 |

### **Trajectory Statement — 7 Types**

| Trajectory | Dr. Sam’s Language |
| :---- | :---- |
| Stabilizing | Stability is rising. The ground is getting more solid. That took something. |
| Rebuilding | Alignment is shifting. The gap between how you are living and what matters to you is closing. |
| Gaining Momentum | Performance is building. The execution is starting to match the intention. |
| Across-the-Board Growth | All three dimensions moved forward. This is what the work looks like. |
| Holding Steady | Your scores are holding. Maintenance is underrated — it means you are not losing ground. |
| Navigating Difficulty | Some scores shifted down. Hard seasons show up in the data. This is honest information, not failure. |
| Mixed Movement | Different dimensions moved in different directions. That is what real life looks like. |

### **What Is Next**

•  Classification changed: new path recommendations surfaced based on new classification

•  Score crossed threshold: coaching mode update notification

•  Reflection answers stored to AI context for next session

•  CTA: Continue coaching  ·  Secondary CTA for Premium: Download my PuP 360 report

## **Reassessment Data Model**

| Field | Type | Description |
| :---- | :---- | :---- |
| AssessmentResult | New table | Every assessment — initial and all reassessments |
| assessment\_id | Unique ID | Auto-generated |
| user\_id | Link to User | The user who took this assessment |
| assessment\_date | Date | Date completed |
| stability\_score | Number | Score 1.0–5.0 |
| performance\_score | Number | Score 1.0–5.0 |
| alignment\_score | Number | Score 1.0–5.0 |
| classification | Text | Classification at this assessment |
| trajectory\_type | Option set | One of 7 types — null for initial |
| is\_initial | Boolean | True for onboarding, false for reassessments |
| reflection\_q1 – q4 | Long text | Optional progress reflection answers |
| path\_adaptive\_q | Long text | The path-specific question shown if applicable |
| pdf\_generated | Boolean | Whether PDF has been generated |
| User.can\_reassess\_on\_demand | Boolean | True for Premium after first reassessment |
| User.last\_assessment\_date | Date | Updated after each assessment |
| User.next\_reassessment\_date | Date | last\_assessment\_date \+ 90 days |

# **Section 3 — PDF Report — Templated Data \+ AI-Generated Narrative**

|  | HOW THE PDF IS BUILT The PDF uses two different generation methods in the same document. Templated sections pull structured data from the AssessmentResult record — fast, no AI call needed. AI-generated sections call the Anthropic API with the user’s full context and receive personalized narrative text. The sequence: assessment complete → scores calculated → AI called for narrative sections → all data assembled → PDF generated → stored and available for download. |
| :---- | :---- |

## **Recommended PDF Generation Tool**

PDF generation from Bubble: use a plugin such as PDF Monkey, DocRaptor, or Bubble’s native HTML-to-PDF. The developer should recommend the approach that best fits the existing Bubble stack. The PDF template is built once and populated dynamically.

## **Pro PDF — Basic Summary — 1-2 Pages**

| Section | Source | AI? |
| :---- | :---- | :---- |
| Cover: name, date, platform name | User record | No |
| Three dimension scores with bar charts | AssessmentResult scores | No |
| Classification name and description | Classification lookup | No |
| Top 3 focus areas | Scoring logic | No |
| Trajectory statement | 7 static statements by Dr. Sam | No |
| Coaching context paragraph (3-4 sentences) | AI call with scores \+ trajectory \+ reflection q1 | YES — generated fresh per user |
| Most recent micro-commitment | User.micro\_commitment\_active | No |
| Reflection question answers | AssessmentResult.reflection\_q1–4 | No |
| Footer: branding \+ coaching disclaimer | Static template | No |

|  | PRO AI CALL Single API call at PDF generation. Prompt: user’s three scores, classification, trajectory type, and reflection answer 1\. AI writes the 3-4 sentence coaching context paragraph in Dr. Sam’s voice. All other Pro PDF content is templated. Keeps generation fast. |
| :---- | :---- |

## **Premium PDF — Full Diagnostic Report — 4-6 Pages**

| Section | Source | AI? |
| :---- | :---- | :---- |
| Everything in Pro PDF | Per above | Pro AI call |
| Sub-dimension scores for each dimension | Scoring logic sub-fields | No |
| Score trend history chart | All AssessmentResult records for this user | No |
| Behavioral fingerprint name and description | User.behavioral\_fingerprint — ONLY revealed here | No |
| Complete path completion history | PathEnrollment and PathResponse records | No |
| Coaching summary — 2-3 paragraphs | AI call with session memory \+ reflection answers 1-4 | YES — AI generated |
| Next 90-day focus recommendations | AI call with scores \+ open threads \+ reflection q4 | YES — AI generated |
| Extended footer with premium branding | Static template | No |

|  | PREMIUM AI CALL One API call with richer prompt: user’s full classification, scores, session memory block (last 5 sessions), path completion history, and all 4 reflection answers. AI writes the coaching summary and next-focus recommendations in Dr. Sam’s voice. The behavioral fingerprint section is templated — the name and description are pulled from the database and inserted, not AI-written. |
| :---- | :---- |

# **Section 4 — Phase 2 Full Build Checklist**

|  | Status | Area | Item | Notes / Spec Reference |
| ----- | :---- | :---- | :---- | :---- |
| **✔** | **DONE** | **Prompt** | Modular prompt assembly built in Bubble | *Confirmed via screenshots* |
| **✔** | **DONE** | **Prompt** | Three surgical prompt edits sent to developer | *Pending implementation* |
| **○** | **PHASE 2** | **Prompt** | Wire 37 new sections from Prompt Library Upgrade | *Prompt Library Upgrade doc shared* |
| **○** | **PHASE 2** | **Prompt** | Add adaptive\_intelligence\_prompt parameter for Final Layer sections | *Final Layer doc shared* |
| **○** | **PHASE 2** | **Prompt** | Wire Master Philosophy and Philosophy of Utility as top two layers | *Must precede all other blocks* |
| **✔** | **CONFIRM** | **Prompt** | Crisis and Safety Protocol wired as non-overridable Layer 1 | *Confirm all 4 severity levels covered* |
| **✖** | **REMOVED** | **Prompt** | User-facing coaching mode toggle | *Removed from UI. User.ai\_coaching\_mode stays in DB only.* |
| **□** | **TO DO** | **Session** | Session close — AI initiates end with synthesis and ending statement | *Currently sessions do not end* |
| **□** | **TO DO** | **Session** | Exchange count passed to AI for session pacing awareness | *Add to live signals block* |
| **✔** | **CONFIRM** | **Session** | DailyCheckIn, CoachingInsight, InsightRead, AssessmentResult data types | *Confirm built in Phase 1* |
| **○** | **PHASE 2** | **Tiers** | Free: 7 sessions per month (updated from 3\) | *Per Section 1* |
| **○** | **PHASE 2** | **Tiers** | Pro: unlimited sessions — no cap | *Differentiated by features not quantity* |
| **○** | **PHASE 2** | **Tiers** | Premium: unlimited sessions \+ on-demand reassessment after day 30 | *Per Section 1* |
| **✔** | **CONFIRM** | **Tiers** | Founding member logic — $19/month, cap 200 users or 90 days | *Confirm Stripe configured* |
| **○** | **PHASE 2** | **Checkout** | Full checkout flow — all screens, all states, all Stripe events | *See Section 5* |
| **○** | **PHASE 2** | **Checkout** | Billing management screen — current plan, renewal, change, cancel | *User-facing subscription management* |
| **○** | **PHASE 2** | **Checkout** | Paywall screens with correct UX copy at correct moments | *UX Copy doc shared* |
| **○** | **PHASE 2** | **Checkout** | Founding member cap enforcement — auto pricing update at user 200 | *Pricing page updates automatically* |
| **○** | **PHASE 2** | **Checkout** | Group coaching add-on billing — $97/month separate Stripe item | *Pro and Premium users only* |
| **✔** | **CONFIRM** | **Paths** | All 18 MVP paths — 129 sessions content-complete vs placeholder | *Confirm count* |
| **✔** | **CONFIRM** | **Paths** | is\_published toggle working — placeholder shows coming soon | *UX Copy doc* |
| **✔** | **CONFIRM** | **Paths** | Path auto-enrollment tested against all 7 classifications | *Each classification enrolls correct Free paths* |
| **✔** | **CONFIRM** | **Paths** | Recovery and grief-flagged paths gated correctly | *Require active flag* |
| **○** | **PHASE 2** | **Paths** | 37 Phase 2 paths — Dr. Sam writes content, loads via admin | *Path Writing Guide shared* |
| **○** | **PHASE 2** | **Paths** | PathResponse answers feed AI context at next session | *Data structure built, wiring is Phase 2* |
| **○** | **PHASE 2** | **Paths** | reassessment\_reflection\_question field on final session of each path | *Dr. Sam writes path-specific variants* |
| **○** | **PHASE 2** | **Reassessment** | AssessmentResult table with all fields per Section 2 | *Full spec in Section 2* |
| **○** | **PHASE 2** | **Reassessment** | 90-day trigger workflow for Pro and Premium | *Scheduled Bubble workflow* |
| **○** | **PHASE 2** | **Reassessment** | Results screen — score cards, trajectory, coaching context, what’s next | *Section 2 defines all components* |
| **○** | **PHASE 2** | **Reassessment** | 4 optional reflection questions \+ path-adaptive variant logic | *Section 2 defines questions and variant logic* |
| **○** | **PHASE 2** | **Reassessment** | Classification and mode update when scores shift | *Auto-updates if classification changes* |
| **○** | **PHASE 2** | **Reassessment** | On-demand reassessment for Premium after first 90-day | *Reassess Now button on dashboard* |
| **○** | **PHASE 2** | **PDF** | Pro PDF — 1-2 pages with one AI-generated paragraph | *PDF generation tool TBD with developer* |
| **○** | **PHASE 2** | **PDF** | Premium PDF — 4-6 pages with AI coaching summary and recommendations | *Two AI calls: coaching summary \+ next focus* |
| **○** | **PHASE 2** | **PDF** | Behavioral fingerprint revealed in Premium PDF only | *Templated pull from User.behavioral\_fingerprint* |
| **○** | **PHASE 2** | **PDF** | PDF generation approach confirmed with developer | *PDF Monkey, DocRaptor, or native — developer recommends* |
| **□** | **TO DO** | **Admin** | Admin dashboard — 7 tabs per Admin Dashboard Spec | *Admin Dashboard Spec shared* |
| **□** | **TO DO** | **Admin** | Content editor — Dr. Sam edits path sessions without developer | *Critical for content management* |
| **□** | **TO DO** | **Admin** | Safety event queue with Level 3+ email alert | *Immediate email notification required* |
| **□** | **TO DO** | **Admin** | User management with all fields visible | *Per Admin Dashboard Spec* |
| **○** | **PHASE 2** | **Admin** | Reassessment results visible per user in admin (read only) | *Assessment history per user* |
| **○** | **PHASE 2** | **Admin** | Organization management for enterprise accounts | *See Section 9* |
| **○** | **PHASE 2** | **Admin** | Pre-session coaching brief generator for PuP team coaches | *Formatted brief: classification, scores, paths, context* |
| **○** | **PHASE 2** | **Wix** | Configure uncloud360.ai as custom domain on Bubble — PRIORITY ITEM | *Developer adds in Bubble settings. Dr. Sam adds DNS record at registrar.* |
| **○** | **PHASE 2** | **Wix** | Wix CTAs redirect to Bubble app with UTM parameters | *Source tracking for analytics* |
| **○** | **PHASE 2** | **Wix** | Pricing page relationship defined — Wix for marketing, Bubble for checkout | *No real-time sync needed* |
| **○** | **PHASE 2** | **Wix** | Onboarding drop-off email — 24-hour re-engagement for incomplete signups | *Bubble/SendGrid triggered workflow* |
| **○** | **PHASE 2** | **Bookings** | Wix Bookings page for PuP coaching team — Premium users only | *Not publicly discoverable from Wix nav* |
| **○** | **PHASE 2** | **Bookings** | Bubble redirect to Wix Bookings with user first name and email pre-filled | *Premium tier only. URL parameter pre-fill where supported.* |
| **○** | **PHASE 2** | **Bookings** | Coach brief sent to assigned coach when booking confirmed | *Email from Wix or Bubble workflow* |
| **○** | **PHASE 2** | **Bookings** | Session logged in Bubble admin after completion | *Coach or Dr. Sam marks complete in admin* |
| **○** | **PHASE 2** | **Email** | Marketing emails via Wix Ascend or Mailchimp connected to Wix | *Waitlist, newsletters, launch comms* |
| **○** | **PHASE 2** | **Email** | Transactional emails via Bubble \+ SendGrid | *Triggered by platform events* |
| **○** | **PHASE 2** | **Email** | Full transactional email sequence built — see Section 8 | *Welcome, billing, milestones, reassessment, re-engagement* |
| **○** | **PHASE 2** | **Check-in** | Full check-in UI — pulse score, feeling word, commitment status | *3 fields, one screen, under 60 seconds* |
| **○** | **PHASE 2** | **Check-in** | Streak tracking and dashboard widget | *Consecutive days counter* |
| **○** | **PHASE 2** | **Check-in** | Check-in data feeds AI live signals block at session start | *Pulse and feeling word available to AI* |
| **○** | **PHASE 2** | **Insights** | Insights feed — 3 articles daily tagged by classification, pillar, nervous system | *30 article briefs shared* |
| **○** | **PHASE 2** | **Insights** | Admin interface for Dr. Sam to publish and tag articles | *No developer for content updates* |
| **○** | **PHASE 2** | **Journal** | AI journal reflection — user shares entry, AI responds | *Pro conversion driver* |
| **✔** | **CONFIRM** | **Milestones** | days\_since\_recovery\_start field on User record | *Required for milestone detection* |
| **○** | **PHASE 2** | **Milestones** | Recovery milestones 24hr through 1yr with AI acknowledgment language | *Milestone language in Crisis Protocol doc* |
| **○** | **PHASE 2** | **Milestones** | Path completion milestones — AI acknowledges at next session | *When user completes all sessions* |
| **○** | **PHASE 2** | **Enterprise** | Organization data type and enrollment code system | *Full spec in Section 9* |
| **○** | **PHASE 2** | **Enterprise** | Enterprise billing bypass — account\_type check before all billing | *CRITICAL — enterprise users never hit Stripe* |
| **○** | **PHASE 2** | **Enterprise** | HR admin aggregate dashboard — no individual data | *Separate read-only view* |
| **○** | **PHASE 2** | **Mobile** | Mobile app — recommend Option 2 Bubble wrapper with App Store listing | *Full spec in Section 10* |
| **○** | **PHASE 2** | **Mobile** | Push notifications for check-in, milestones, new sessions | *Requires mobile or PWA* |
| **○** | **PHASE 2** | **Mobile** | All key screens mobile-tested on iOS and Android | *Onboarding, session, check-in, path, paywall* |
| **?** | **CLARIFY** | **Mobile** | Developer accounts in Proven Under Pressure LLC name | *Apple $99/yr, Google $25 one-time* |
| **?** | **CLARIFY** | **Mobile** | In-app purchase strategy — avoid Apple 30% fee | *Web-only billing or accept fee* |
| **○** | **PHASE 2** | **Analytics** | Product analytics tool configured — Mixpanel, Amplitude, or PostHog | *See Section 11 for events to track* |
| **○** | **PHASE 2** | **Analytics** | Wix analytics for marketing site attribution | *UTM parameters passed to Bubble* |
| **○** | **PHASE 2** | **Analytics** | Conversion funnel tracking — signup through paid conversion | *Key events listed in Section 11* |
| **✔** | **DONE** | **Legal** | Privacy Policy on Wix — update handled separately by Dr. Sam | *NOT a developer task. Developer only adds links to the Bubble app.* |
| **✔** | **DONE** | **Legal** | Terms and Conditions on Wix — handled separately by Dr. Sam | *NOT a developer task. Developer only adds links to the Bubble app.* |
| **□** | **TO DO** | **Legal** | Privacy Policy and Terms links in Bubble app footer | *Links to provenunderpressure.com/blank and /blank-3* |
| **□** | **TO DO** | **Legal** | Coaching disclaimer in Bubble sign-up flow and PDF footer | *Text provided separately by Dr. Sam* |
| **□** | **TO DO** | **Legal** | Data deletion request feature in Bubble app settings | *User can request account deletion* |
| **○** | **PHASE 2** | **Access** | WCAG 2.1 AA compliance — color contrast, screen reader, keyboard nav | *Legal exposure \+ user need* |
| **✔** | **CONFIRM** | **UX** | No placeholder text anywhere in live app | *All states covered in UX Copy doc* |
| **○** | **PHASE 2** | **Launch** | Launch readiness checklist completed — see Section 14 | *All items checked before first real user* |
| **○** | **PHASE 2** | **Launch** | Waitlist on Wix notified with launch sequence | *T-7, T-1, launch day, T+3 email sequence* |

# **Section 5 — Checkout and Billing — Complete Flow Specification**

The document has referenced a checkout experience but has not defined it fully. This section specifies every screen, state, and Stripe event needed for a complete billing experience.

## **The Checkout Flow — Individual Users**

1\.  User hits session limit or locked feature. Paywall screen appears with tier options and founding member pricing if still available.

2\.  User selects Pro or Premium. Stripe checkout loads — hosted Stripe page or Bubble-embedded Stripe Elements.

3\.  User enters card details. Stripe processes payment. Webhook fires to Bubble: customer.subscription.created.

4\.  Bubble receives webhook, updates User.tier to Pro or Premium, clears session limit counter, updates dashboard.

5\.  User sees success screen: 'You’re in. Your \[Pro/Premium\] experience starts now.' with immediate access.

6\.  Confirmation email fires via SendGrid within 60 seconds.

## **Stripe Events That Must Be Handled**

| Stripe Event | Bubble Action Required |
| :---- | :---- |
| customer.subscription.created | Update User.tier, set subscription\_start\_date, clear session limit |
| customer.subscription.updated | Reflect tier change — upgrade or downgrade |
| customer.subscription.deleted | Downgrade User.tier to Free, retain data, show re-engagement message |
| invoice.payment\_succeeded | Log payment, send billing confirmation email |
| invoice.payment\_failed | Send payment failure email, show retry prompt in-app, grace period 7 days |
| customer.subscription.trial\_will\_end | N/A — no trials on this platform |
| charge.dispute.created | Alert Dr. Sam via admin email |

## **Billing Management Screen — User Facing**

•  Current plan with price and renewal date

•  Founding member badge if applicable: ‘Founding Member — $19/month locked in’

•  Change plan: upgrade or downgrade with immediate or end-of-cycle effect

•  Cancel subscription: confirmation step, data retention message, exit survey (optional)

•  Payment method: update card via Stripe Customer Portal link

•  Invoice history: last 3 billing events with download link

## **Founding Member Cap Logic**

•  Stripe product for founding member rate: $19/month, created as a separate price ID

•  Bubble tracks founding member count. When count reaches 200: Founding Member Stripe price is deactivated, pricing page updates automatically to show $29 as standard Pro rate

•  Users who are already founding members are unaffected — their subscription continues at $19

•  Dr. Sam receives an email notification when the founding member cap is reached

•  The countdown widget on the pricing page shows remaining spots — updated in real time from Bubble

# **Section 6 — Domain Architecture and Wix Integration**

|  | THREE-DOMAIN ARCHITECTURE — LOCKED DECISION provenunderpressure.com is the company home. uncloud360.ai is the product. getuncloud360.com is the campaign bridge. These stay separate permanently. Two distinct SEO authority pools, a clean company vs product identity, and flexibility for future products under Proven Under Pressure LLC. |
| :---- | :---- |

## **Domain Map — What Goes Where**

| Domain | Platform | Role | Who Manages |
| :---- | :---- | :---- | :---- |
| provenunderpressure.com | Wix | Company home: brand, Dr. Sam, coaching services, enterprise inquiry, legal pages, blog, waitlist | Dr. Sam on Wix |
| uncloud360.ai | Bubble | The product: the app, diagnostic, AI coaching, subscriptions, billing, user data | Developer configures |
| getuncloud360.com | Redirect only | Campaign domain: TikTok links, podcast CTAs, ads, QR codes. Redirects to app or Wix per campaign. | Dr. Sam at registrar |

## **Developer Tasks — Domain Configuration**

|  | PRIORITY ITEM — DO FIRST Configure uncloud360.ai as the custom domain on the Bubble app before any other Phase 2 work. Every link, CTA, and email depends on it. |
| :---- | :---- |

1\.  In Bubble settings: add custom domain uncloud360.ai

2\.  Bubble provides the CNAME or A record target

3\.  Dr. Sam adds the DNS record at the registrar for uncloud360.ai

4\.  SSL certificate provisioned by Bubble — confirm HTTPS working

5\.  Test: uncloud360.ai loads the Bubble app correctly

6\.  getuncloud360.com: set up 301 redirect at registrar. getuncloud360.com → uncloud360.ai/signup. No Bubble configuration needed for this domain.

## **Email Identity — What Sends From Where**

| Email Type | From Address | System | Examples |
| :---- | :---- | :---- | :---- |
| Transactional — platform events | noreply@uncloud360.ai | Bubble \+ SendGrid | Welcome, billing, milestones, reassessment, re-engagement |
| Company inquiries — already set up | info@provenunderpressure.com | Existing Wix email | Contact form responses, enterprise inquiries, general questions |
| Marketing — campaigns and content | hello@provenunderpressure.com or Wix Ascend | Wix | Waitlist, newsletter, launch sequence, content emails |

|  | SENDGRID SETUP FOR DEVELOPER Configure SendGrid to send transactional emails from noreply@uncloud360.ai. Required steps: (1) add uncloud360.ai as a verified sender domain in SendGrid, (2) add the SendGrid DNS records at the uncloud360.ai registrar, (3) connect SendGrid to Bubble workflows. If SendGrid is already configured for existing Bubble email alerts, extend it to cover all transactional emails in Section 8\. |
| :---- | :---- |

## **getuncloud360.com — Campaign Redirect Rules**

Redirect-only domain. No content, no Bubble configuration needed. Set up at the domain registrar:

| URL | Redirects To | Use Case |
| :---- | :---- | :---- |
| getuncloud360.com | uncloud360.ai/signup | Default: TikTok bio, podcast CTAs, general marketing |
| getuncloud360.com/pro | uncloud360.ai/upgrade | Pro upgrade campaigns |
| getuncloud360.com/enterprise | provenunderpressure.com/fororganizations | Enterprise inquiry campaigns |
| getuncloud360.com/founding | uncloud360.ai/signup?plan=founding | Founding member campaigns |

## **UTM Parameter Strategy**

Every CTA on the Wix site linking to Bubble should carry UTM parameters. The developer configures Bubble to capture and store UTM parameters on the User record at signup.

| Source / CTA | Destination | UTM Parameters |
| :---- | :---- | :---- |
| Wix homepage CTA | uncloud360.ai/signup | utm\_source=wix\&utm\_medium=homepage\&utm\_campaign=launch |
| Wix For Individuals page | uncloud360.ai/signup | utm\_source=wix\&utm\_medium=individuals |
| TikTok bio link | getuncloud360.com | utm\_source=tiktok\&utm\_medium=social |
| Podcast appearance CTA | getuncloud360.com | utm\_source=podcast\&utm\_medium=audio\&utm\_campaign=\[show\] |
| Email campaign CTA | uncloud360.ai/signup | utm\_source=email\&utm\_medium=newsletter |

## **Onboarding Drop-Off Recovery**

•  Trigger: User.onboarding\_complete \= false AND created\_date \= yesterday

•  From: noreply@uncloud360.ai  |  Subject: Your PuP 360 results are waiting for you

•  CTA links to exact onboarding screen where they stopped

•  If no completion after 7 days: one final re-engagement email then stop

## **Legal Pages — Note for Developer**

|  | NOT A DEVELOPER TASK Legal page content (Privacy Policy, Terms and Conditions, Coaching Disclaimer text) is being handled separately by Dr. Sam outside of the development scope. The developer’s only legal-related tasks are the four items below. |
| :---- | :---- |

•  Add footer to Bubble app with links: Privacy Policy → provenunderpressure.com/blank  |  Terms → provenunderpressure.com/blank-3

•  Add sign-up checkbox: I agree to the Terms and Conditions and Privacy Policy — required before account creation

•  Add coaching disclaimer to sign-up screen and to the footer of every PDF report

•  Add Settings option: Request account deletion — sends email to info@provenunderpressure.com with user details

# **Section 7 — Wix Bookings — 1:1 Coaching Session Booking**

Premium users book 1:1 coaching sessions with the PuP coaching team through Wix Bookings. The booking lives on Wix. The Bubble app redirects Premium users to it at the right moment. This section defines the complete flow.

## **The Booking Flow**

1\.  Premium user taps ‘Book a 1:1 coaching session’ in the Bubble app dashboard or coaching screen.

2\.  Bubble redirects to a dedicated Wix Bookings page. The URL carries the user’s first name and email as parameters where Wix Bookings supports pre-fill. This reduces friction in the booking form.

3\.  User selects an available coach, date, and time on Wix Bookings. Wix handles the calendar availability.

4\.  Booking confirmed. Wix sends the user a confirmation email with calendar invite. Wix also emails the assigned coach.

5\.  Dr. Sam or admin is notified of the new booking. Admin pulls the user’s pre-session brief from the Bubble admin dashboard.

6\.  Pre-session brief is sent to the assigned coach: classification, scores, active paths, most recent session context, micro-commitment, and any flag status (recovery, grief).

7\.  Session takes place via Zoom or phone — outside the platform.

8\.  After the session: coach or Dr. Sam logs the session completion in the Bubble admin dashboard. Bubble record updated with session\_count and last\_coaching\_session\_date.

## **Wix Bookings Page Configuration**

•  Page URL: bookings.provenunderpressure.com/coaching or similar — not accessible from Wix main navigation

•  Page title: ‘Book Your PuP Coaching Session’

•  Coach profiles listed: name, specialization areas (expressed in plain language, not classification jargon), photo

•  Session duration: 50 minutes standard

•  Session price: shown as ‘Included with Premium membership’ — $0 charge in Wix Bookings for this service (billing already handled by Stripe in Bubble)

•  Cancellation policy: 24 hours notice required

•  Confirmation page: ‘Your session is booked. Your coach will be in touch before your session with a few things to think about.’

## **Pre-Session Coach Brief**

When a booking is confirmed, Dr. Sam or admin generates a brief from the Bubble admin and sends it to the assigned coach. The brief includes:

•  User first name, classification, Stability / Performance / Alignment scores

•  Active pillar and sub-mode

•  Recovery or grief flag if active

•  Current path enrollment and session count completed

•  Most recent micro-commitment set

•  Most recent session summary (one sentence from the session memory block)

•  Reflection answers from most recent reassessment if completed

•  Any open unresolved threads from AI memory block

|  | PHASE 2 ENHANCEMENT Build the pre-session brief as a one-click PDF export from the user’s admin profile. Coach receives it automatically when a booking is assigned. This removes the manual step and ensures every coach is prepared before every session. |
| :---- | :---- |

# **Section 8 — Email System Specification**

|  | ARCHITECTURE DECISION Marketing emails (waitlist, newsletters, launch communications, content) live in Wix via Wix Ascend or Mailchimp connected to Wix. Transactional emails (triggered by platform events) originate from Bubble via SendGrid. They share visual branding but operate independently. This is the standard architecture — it keeps platform-triggered emails reliable without requiring Wix-Bubble sync. |
| :---- | :---- |

## **Transactional Emails — Bubble \+ SendGrid**

| Email | Trigger | Subject Line (draft) | Priority |
| :---- | :---- | :---- | :---- |
| Welcome — Free signup | Onboarding complete | Your PuP 360 results are in | Critical |
| Welcome — Pro signup | Stripe subscription.created | You’re a Pro member. Here’s what’s unlocked. | Critical |
| Welcome — Founding Member | Stripe subscription.created (founding price) | You’re a Founding Member. That rate is yours for life. | Critical |
| Welcome — Premium signup | Stripe subscription.created | Welcome to Premium. Your full diagnostic picture starts here. | Critical |
| Billing confirmation | invoice.payment\_succeeded | Your Uncloud360 payment was received | Critical |
| Payment failed | invoice.payment\_failed | There was an issue with your payment | Critical |
| Subscription cancelled | subscription.deleted | Your subscription has ended — your data is still here | Critical |
| Onboarding drop-off | Onboarding incomplete after 24hr | Your PuP 360 results are waiting for you | High |
| 90-day reassessment prompt | next\_reassessment\_date reached | Your 90-day check-in is ready | High |
| Milestone reached — recovery | days\_since\_recovery\_start milestone | \[Milestone name\] — your coach has something for you | High |
| Path completion | All sessions in path completed | You finished \[path name\]. That’s real. | Medium |
| Re-engagement — 7 days inactive | No session in 7 days | Your coach is here when you’re ready | Medium |
| Group coaching session reminder | 24 hours before scheduled group session | Your group coaching session is tomorrow | Medium |
| Coaching session booked confirmation | Wix Bookings webhook or manual | Your coaching session is confirmed | Medium |

## **Marketing Emails — Wix Ascend or Mailchimp**

•  Waitlist welcome: sent immediately when someone submits the Wix waitlist form

•  Launch sequence: T-7, T-1, launch day, T+3 — four emails to the waitlist with early access CTA

•  Weekly newsletter: Dr. Sam’s voice, one insight or story, link to latest blog post or path content preview

•  Founding member countdown: email at 100 spots remaining, 50 remaining, 10 remaining

•  Content emails: new TikTok series, podcast appearance announcements, new path launches

# **Section 9 — Enterprise and Workplace Account System**

When an employer signs a contract, their employees access Uncloud360 without individual billing. The system identifies enterprise users, links them to their organization, and tracks aggregate usage.

## **Enrollment Flow**

1\.  Dr. Sam creates Organization record in admin: org name, unique enrollment code, contract tier, seat count.

2\.  Dr. Sam sends enrollment code to HR contact.

3\.  Employee signs up through normal onboarding. A screen asks: 'Do you have a workplace enrollment code?'

4\.  Valid code: User.account\_type \= enterprise, org\_id links to Organization, enterprise\_tier copied from contract. Stripe bypassed entirely.

5\.  Seat check: if active\_seats would exceed seat\_count → 'Your organization’s seats are full. Contact your HR team.'

6\.  No code: user proceeds through standard individual subscription flow.

|  | CRITICAL BILLING RULE When User.account\_type \= enterprise: Stripe does not apply. No pricing screens, no upgrade prompts, no session limits. All gating logic checks account\_type first. If enterprise → use enterprise\_tier. If individual → use standard tier logic. |
| :---- | :---- |

## **Organization Table**

| Field | Type | Description |
| :---- | :---- | :---- |
| org\_id | Unique ID | Auto-generated |
| org\_name | Text | Company name |
| enrollment\_code | Text (unique) | 6-8 char code — e.g. ACME-2026 |
| contract\_tier | Option set | Pro or Premium |
| seat\_count | Number | Total seats purchased |
| active\_seats | Number | Current enrolled employees — auto-calculated |
| contract\_start\_date | Date | Contract start |
| contract\_end\_date | Date | Contract expiry — triggers renewal workflow |
| hr\_admin\_email | Text | HR contact for usage reports |
| is\_active | Boolean | Whether contract is active |

## **User Record Additions**

| Field | Type | Description |
| :---- | :---- | :---- |
| account\_type | Option set | individual or enterprise |
| org\_id | Link to Organization | Null for individual users |
| enterprise\_tier | Option set | Pro or Premium — copied from org contract |
| enrollment\_date | Date | Date enterprise enrollment completed |

# **Section 10 — Mobile App**

Three options for the developer to scope. Recommendation is Option 2\.

| Option 1 — Progressive Web App (PWA) |  |
| :---- | :---- |
| **Advantages** ✔  Built on existing Bubble app — no parallel codebase ✔  Fastest and least expensive ✔  No App Store required ✔  Works on iOS and Android immediately | **Limitations** ✖  Limited push notifications on iOS ✖  No App Store or Google Play listing ✖  Below native app quality |

| Option 2 — Bubble Wrapper with App Store Listing — RECOMMENDED |  |
| :---- | :---- |
| **Advantages** ✔  App Store and Google Play listing — discoverable ✔  Real push notifications on both platforms ✔  Still built on Bubble — no parallel codebase ✔  Moderate cost and timeline | **Limitations** ✖  App Store review process (1-2 weeks) ✖  App Store and Play annual fees ✖  Some limitations vs fully native ✖  Bubble UI must be mobile-optimized |

| Option 3 — Fully Native — Future Consideration |  |
| :---- | :---- |
| **Advantages** ✔  Best mobile experience ✔  Full push notifications ✔  All native device features | **Limitations** ✖  Highest cost and longest timeline ✖  Parallel codebase to maintain ✖  Not recommended until platform is proven |

|  | MOBILE REQUIREMENTS REGARDLESS OF OPTION Push notifications: daily check-in reminder, milestone alerts, new path session, 5-day inactivity follow-up. Mobile-tested screens: onboarding, coaching session, check-in, path session, dashboard, paywall. Developer accounts in Proven Under Pressure LLC name: Apple Developer ($99/yr), Google Play ($25 one-time). In-app purchase strategy: discuss with developer — web-only billing preferred to avoid Apple 30% fee. |
| :---- | :---- |

# **Section 11 — Analytics and Tracking**

|  | WITHOUT ANALYTICS YOU ARE FLYING BLIND You cannot improve what you cannot measure. Analytics must be configured before launch so you have baseline data from day one. Retroactive analytics setup means losing the most valuable data — early user behavior. |
| :---- | :---- |

## **Recommended Tools**

| Tool | Purpose | Where |
| :---- | :---- | :---- |
| Mixpanel or PostHog | Product analytics — user behavior inside the app | Bubble |
| Google Analytics 4 | Marketing site traffic and attribution | Wix (already partially configured) |
| SendGrid Analytics | Email open rates, click rates, deliverability | Connected to transactional email |
| Stripe Dashboard | Revenue, churn, MRR, LTV | Native Stripe — no setup needed |

## **Events to Track in Bubble (Mixpanel or PostHog)**

| Event | What It Tells You |
| :---- | :---- |
| onboarding\_started | How many people begin the diagnostic |
| onboarding\_completed | Completion rate — drop-off by screen |
| classification\_assigned | Distribution of classifications across users |
| session\_started | Session frequency by tier and classification |
| session\_completed | Average session completion rate |
| paywall\_shown | How often users hit the wall and where |
| free\_to\_pro\_conversion | Conversion rate and time-to-convert |
| founding\_member\_conversion | Founding member conversion specifically |
| pro\_to\_premium\_upgrade | Upgrade rate and trigger moment |
| path\_session\_completed | Path engagement and completion rates |
| reassessment\_completed | 90-day retention indicator |
| pdf\_downloaded | PDF feature engagement by tier |
| booking\_initiated | Premium coaching funnel start |
| check\_in\_completed | Daily engagement metric |
| subscription\_cancelled | Churn event with plan and tenure data |

# **Section 12 — Legal and Compliance**

|  | NOT A DEVELOPER TASK Legal page content is being handled by Dr. Sam separately. This section is for Dr. Sam’s reference. Developer tasks are limited to: adding links to the Bubble app footer, the sign-up checkbox, the coaching disclaimer, and the data deletion request option in Settings. |
| :---- | :---- |

## **Existing Legal Pages on Wix — Status (Dr. Sam Reference)**

| Page | URL | Status | Action Required |
| :---- | :---- | :---- | :---- |
| Privacy Policy | provenunderpressure.com/blank | Live — generic content | Add Uncloud360 platform-specific section |
| Accessibility Statement | provenunderpressure.com/blank-1 | Live | Review for accuracy |
| Terms and Conditions | provenunderpressure.com/blank-3 | Page exists — appears blank | Must be written before launch |
| Coaching Disclaimer | Not present | Missing | Must be added |

## **Privacy Policy — What Needs to Be Added**

The existing Wix Privacy Policy is a good generic document. Before launch it needs a Uncloud360 platform-specific section added:

•  Specifically name Uncloud360 and describe what data the platform collects: PuP 360 assessment responses, AI coaching session content, recovery status, grief status, daily check-in data, path session reflection answers

•  Clarify that Uncloud360 is coaching, not healthcare. HIPAA does not apply. The platform is not a covered entity and does not provide medical advice or treatment.

•  State explicitly: coaching session content is private and never shared with employers, partners, or any third party

•  Data retention: user data is retained for 2 years after cancellation unless deletion is requested

•  Data deletion: users can request full account deletion from Settings. Data deleted within 30 days of request.

•  California users: CCPA rights acknowledged — right to know, right to delete, right to opt out of sale (we do not sell data)

•  Enterprise users: aggregate data shared with employer HR contact only. Individual data is never shared with employers.

## **Terms and Conditions — Must Be Written**

The Terms and Conditions page exists on Wix but is currently blank. This must be written and published before any paid users sign up. Key sections needed:

•  Description of services: Uncloud360 is an AI-powered adaptive human guidance platform. It is not therapy, counseling, or medical treatment.

•  Subscription terms: billing cycle, renewal, cancellation policy, refund policy

•  Founding member terms: rate locked for life of subscription, forfeited on cancellation

•  Acceptable use: platform is for adults 18+, not for clinical mental health treatment

•  Limitation of liability: coaching guidance only, not clinical advice

•  Governing law: Florida

## **Coaching Disclaimer — Must Be in Bubble App**

The following disclaimer must appear in the Bubble app at sign-up (checkbox acknowledgment) and in the footer of every PDF report:

|  | COACHING DISCLAIMER TEXT Uncloud360 is an adaptive human guidance platform that provides AI-powered coaching support. It is not a substitute for therapy, counseling, psychiatry, or any other licensed mental health or medical service. If you are experiencing a mental health crisis, please contact the 988 Suicide and Crisis Lifeline (call or text 988\) or your local emergency services. Uncloud360 is not a covered entity under HIPAA. |
| :---- | :---- |

## **Legal Pages in the Bubble App**

The Bubble app currently has no links to legal documents. Before launch, add to the Bubble app:

•  Footer link to Privacy Policy — links to provenunderpressure.com/blank

•  Footer link to Terms and Conditions — links to provenunderpressure.com/blank-3

•  Sign-up checkbox: 'I agree to the Terms and Conditions and Privacy Policy' with links

•  Settings page: link to data deletion request form or email

# **Section 13 — Testing Plan**

Before any real users sign up, every critical flow must be tested end-to-end. The developer runs these tests. Dr. Sam or a designated tester runs user-perspective tests.

| Test Area | Specific Test Cases | Who Tests |
| :---- | :---- | :---- |
| Onboarding | Complete all 12 screens for each of the 7 classifications. Confirm correct classification, paths enrolled, and dashboard state for each. | Developer \+ Dr. Sam |
| AI Sessions | Open a session in each of the 5 coaching modes. Confirm mode-appropriate tone. Test the closing protocol. Test crisis language detection at Level 2 and Level 3\. | Dr. Sam |
| Tier Gating | Free: confirm session 8 shows paywall. Pro: confirm unlimited. Premium: confirm all 55 paths. Enterprise: confirm no paywall at all. | Developer |
| Checkout | Complete a real subscription purchase on Stripe test mode. Test upgrade, downgrade, cancellation. Test payment failure and retry. | Developer |
| Founding Member | Confirm $19 rate applies. Simulate user 200 — confirm cap enforcement. Confirm pricing page updates. | Developer |
| Reassessment | Trigger 90-day reassessment for a Pro user. Confirm all 7 trajectory types generate correct language. Confirm PDF generates. | Developer \+ Dr. Sam |
| PDF Generation | Generate Pro PDF and Premium PDF. Confirm all fields populate. Confirm AI-generated sections are present and in Dr. Sam’s voice. | Dr. Sam |
| Enterprise Enrollment | Create test org with enrollment code. Sign up as employee with code. Confirm no Stripe billing. Confirm correct tier access. | Developer |
| Wix Redirect | Click every CTA on Wix that goes to Bubble. Confirm UTM parameters present in analytics. Confirm correct landing page. | Developer |
| Email System | Trigger every transactional email on test data. Confirm delivery, correct content, and correct from-address. | Developer |
| Safety Protocol | Send test message with Level 2 and Level 3 crisis language. Confirm AI response matches protocol. Confirm safety event appears in admin queue. | Dr. Sam |
| Legal | Confirm Privacy Policy and T\&C links appear in Bubble app. Confirm sign-up checkbox is required. Confirm disclaimer is in PDF footer. | Developer |
| Mobile | Complete full onboarding flow on iOS and Android. Test coaching session on mobile. Test check-in on mobile. Test paywall on mobile. | Developer \+ Dr. Sam |

# **Section 14 — Launch Readiness Checklist**

Every item on this list must be checked before the first real user signs up. This is the gate.

| ✓ | Area | Item |
| ----- | :---- | :---- |
| □ | **Platform** | Onboarding flow complete and tested for all 7 classifications |
| □ | **Platform** | AI sessions close properly with synthesis and ending statement |
| □ | **Platform** | Crisis language detection tested and confirmed at all 4 severity levels |
| □ | **Platform** | Safety event queue active and Level 3+ email alert confirmed working |
| □ | **Platform** | All 18 MVP paths loaded with content-complete sessions published |
| □ | **Platform** | Tier gating tested end-to-end for Free, Pro, Premium, and Enterprise |
| □ | **Platform** | No placeholder text anywhere in the app |
| □ | **Platform** | Custom domain configured — app.uncloud360.com or agreed domain |
| □ | **Billing** | Stripe live mode configured (not test mode) |
| □ | **Billing** | Founding member $19 price ID active in Stripe |
| □ | **Billing** | Founding member cap logic working — auto-updates at 200 users |
| □ | **Billing** | All Stripe webhook events handled and tested |
| □ | **Legal** | Terms and Conditions written and live on Wix |
| □ | **Legal** | Privacy Policy updated with Uncloud360 platform section |
| □ | **Legal** | Coaching disclaimer in Bubble app sign-up flow and PDF footer |
| □ | **Legal** | Legal page links in Bubble app footer |
| □ | **Legal** | Data deletion request process in place |
| □ | **Email** | All transactional email templates created in SendGrid |
| □ | **Email** | All emails tested — delivery, content, from-address confirmed |
| □ | **Email** | Onboarding drop-off re-engagement email active |
| □ | **Wix** | All Wix CTAs link to correct Bubble pages with UTM parameters |
| □ | **Wix** | Launch email sequence prepared and scheduled for waitlist |
| □ | **Wix** | Founding member countdown widget on pricing page active |
| □ | **Analytics** | Mixpanel or PostHog configured and receiving events |
| □ | **Analytics** | All key events listed in Section 11 are firing correctly |
| □ | **Wix Bookings** | PuP coaching team bookings page live and accessible via redirect from Bubble |
| □ | **Clinical** | Crisis and Safety Protocol reviewed by licensed clinical professional |
| □ | **Clinical** | SAMHSA helpline number confirmed current: 1-800-662-4357 |
| □ | **Mobile** | App Store submission complete OR mobile-optimized web confirmed tested |

# **Section 15 — Questions for Today’s Call**

| 1 | Prompt fields | Can you share the current content of every prompt field — especially general\_rules and all mode prompts? Cannot map new sections without seeing existing content. |
| :---: | :---- | :---- |

| 2 | Phase 1 data types | Were DailyCheckIn, CoachingInsight, InsightRead, and AssessmentResult data types built in Phase 1? If not, can they be added as Phase 1 closeout? |
| :---: | :---- | :---- |

| 3 | Path content | How many of the 129 MVP path sessions have content loaded vs placeholder? Can you share a list? |
| :---: | :---- | :---- |

| 4 | Session close | What does it take to wire the closing protocol? Prompt change only or does it require workflow changes? |
| :---: | :---- | :---- |

| 5 | Coaching mode toggle | Confirmed removal from UI. User.ai\_coaching\_mode stays in DB driven by classification engine only. Is this straightforward to implement? |
| :---: | :---- | :---- |

| 6 | PDF generation | What tool do you recommend for PDF generation in Bubble — PDF Monkey, DocRaptor, or native? The Pro PDF has one AI call, Premium PDF has two. |
| :---: | :---- | :---- |

| 7 | Mobile approach | Which option do you recommend for this Bubble-based platform? What is the estimate and timeline for Option 2? |
| :---: | :---- | :---- |

| 8 | In-app purchase | If we go mobile via App Store, how do you recommend handling subscriptions to avoid Apple’s 30% fee? |
| :---: | :---- | :---- |

| 9 | Domain setup | What is needed to configure app.uncloud360.com (or agreed domain) on the Bubble app? Timeline for this? |
| :---: | :---- | :---- |

| 10 | Wix to Bubble redirect | Can you configure the redirect from Wix CTAs to the Bubble app with UTM parameter passthrough? Or is this a Wix-side task? |
| :---: | :---- | :---- |

| 11 | Wix Bookings redirect | Can the Bubble app pass the user’s first name and email to the Wix Bookings URL as parameters to pre-fill the booking form? |
| :---: | :---- | :---- |

| 12 | SendGrid setup | Is SendGrid already configured in Bubble for the existing email alerts? If so, can we extend it for the full transactional email system? |
| :---: | :---- | :---- |

| 13 | Analytics | Do you recommend Mixpanel or PostHog for product analytics in Bubble? What is the integration complexity? |
| :---: | :---- | :---- |

| 14 | Enterprise accounts | Is the Organization data type and enrollment code system straightforward in Bubble? Any concerns? |
| :---: | :---- | :---- |

| 15 | Tier update | Free changes from 3 to 7 sessions per month. Pro becomes unlimited. Can gating logic be updated to reflect Section 1 architecture? |
| :---: | :---- | :---- |

| 16 | Phase 2 estimate | Can you break the estimate down by feature area with milestone dates? We may need to phase delivery if budget requires it. |
| :---: | :---- | :---- |

*Uncloud360™  ·  Proven Under Pressure LLC  ·  Phase 2 Requirements v3  ·  Confidential*