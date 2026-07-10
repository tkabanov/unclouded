**Uncloud360™**

**PuP 360™ v2 — Complete Master Developer Build Brief**

*Living Human Diagnostic \+ Adaptive Coaching System*

| Dr. Sam  ·  April 2026  ·  Confidential For Bubble Developers  ·  Read completely before building anything Proven Under Pressure |
| :---: |

|  | CRITICAL READING NOTE This document governs the entire Uncloud360 platform. Every feature — dashboard, AI coaching, path assignment, module delivery, notifications, subscription gating, trajectory tracking, and enterprise reporting — depends on data collected here. Build in the order presented in Section 18\. Do not skip sections or build out of sequence. |
| :---- | :---- |

| SECTION 1 — PLATFORM VISION & ARCHITECTURE |
| :---: |

## **What Uncloud360 Is**

Uncloud360 is a human performance operating system. It is not a wellness app, a journaling tool, or a chatbot. It is a living diagnostic and adaptive coaching system that builds a complete picture of how a person functions under pressure — and then uses that picture to personalize every aspect of their coaching experience.

The PuP 360™ assessment is the engine that powers this. It captures how a person is operating (Function), what is acting on them (Load), how their body is holding it (State), and — through progressive deep-dive modules — who they believe they are, how they make decisions, and what their life is actually costing them.

## **The Three-Phase Product Architecture**

| Phase | Name | Users | Core Capability |
| :---- | :---- | :---- | :---- |
| 1 | Consumer Platform | Individuals — B2C | Full diagnostic, adaptive AI coaching, path library, module system |
| 2 | Advanced Intelligence | Power users — Pro tier | Perception gap detection, behavior loop, micro-commitments, session memory |
| 3 | Enterprise Platform | Organizations — B2B | Aggregated insights, burnout risk, team heatmaps, HR reporting |

## **The Eight-Layer Human Model**

| Layer | Name | What It Measures | Captured |
| :---- | :---- | :---- | :---- |
| 1 | FUNCTION | Stability · Performance · Alignment | Core Onboarding |
| 2 | LOAD | Cognitive · Relational · Environmental · Financial | Onboarding surface \+ Modules |
| 3 | STATE | Nervous system · Energy · Somatic signals | Onboarding surface \+ Body Module |
| 4 | IDENTITY | Self-worth · Narrative · Role fusion | Identity Lens Module |
| 5 | RELATIONAL PATTERN | Attachment · Conflict · Support capacity | Relational Blueprint Module |
| 6 | HISTORY & CONTEXT | Trauma presence · Grief · Formative patterns | History Module |
| 7 | MEANING & SPIRITUALITY | Purpose · Faith · Belonging · Existential orientation | What Holds You Module |
| 8 | PRACTICAL REALITY | Financial health · Housing · Dependent load | Financial Reality \+ Body Module |

## **System Outputs — What Gets Produced**

* Primary Classification — one of 7 types based on Function scores

* Pressure Profile — Load \+ State combination

* Behavioral Fingerprint — how the user responds under pressure

* Tradeoff Statement — what their current pattern is costing them

* AI Coaching Mode — Stabilizer / Simplifier / Strategist / Rebuilder / Protector

* AI Confidence Level — Exploratory / Guided / Direct

* Dashboard Configuration — layout and content governed by classification \+ pillar

* Path Enrollment — automatic assignment from path library

* Trajectory Type — Stabilizing / Volatile / Stuck / Accelerating (post reassessment)

| SECTION 2 — COMPLETE DATABASE SCHEMA |
| :---: |

|  | BUILD ORDER Create ALL database fields before building any workflows. Every field listed here must exist before onboarding is built. Missing fields cause silent failures in Bubble workflows. |
| :---- | :---- |

## **User Data Type — All Fields**

### **Core Identity**

| Field | Type | Source | Notes |
| :---- | :---- | :---- | :---- |
| first\_name | text | Screen 2 | Used in all AI prompts and greetings |
| role\_type | text | Screen 3 | pro / student / caregiver / transition / retired |
| primary\_pillar | text | Screen 4 | emotional / professional / health — dashboard focus |
| onboarding\_complete | yes/no | Completion workflow | Gates main app. Default no. |
| assessment\_date | date | Completion workflow | Used for 90-day reassessment scheduling |

### **Function Scores**

| Field | Type | Calculation | Notes |
| :---- | :---- | :---- | :---- |
| stability\_score | number | avg(sq1-sq5) | 1 decimal e.g. 3.4 |
| performance\_score | number | avg(pq1-pq5) | Role-adaptive questions, identical calculation |
| alignment\_score | number | avg(aq1-aq5) | 1 decimal |
| orientation\_score | number | Screen 8 direct | 1-5 single value — classification use only |
| sq1 | number | Screen 5 | Raw Stability Q1 |
| sq2 | number | Screen 5 | Raw Stability Q2 |
| sq3 | number | Screen 5 | Raw Stability Q3 |
| sq4 | number | Screen 5 | Raw Stability Q4 |
| sq5 | number | Screen 5 | Raw Stability Q5 |
| pq1 | number | Screen 6 | Raw Performance Q1 |
| pq2 | number | Screen 6 | Raw Performance Q2 |
| pq3 | number | Screen 6 | Raw Performance Q3 |
| pq4 | number | Screen 6 | Raw Performance Q4 |
| pq5 | number | Screen 6 | Raw Performance Q5 |
| aq1 | number | Screen 7 | Raw Alignment Q1 |
| aq2 | number | Screen 7 | Raw Alignment Q2 |
| aq3 | number | Screen 7 | Raw Alignment Q3 |
| aq4 | number | Screen 7 | Raw Alignment Q4 |
| aq5 | number | Screen 7 | Raw Alignment Q5 |

### **Load & State Signals**

| Field | Type | Values | Source |
| :---- | :---- | :---- | :---- |
| cognitive\_load\_signal | text | low / medium / high | Screen 9 |
| relational\_load\_signal | text | low / medium / high | Screen 9 |
| environmental\_load\_signal | text | low / medium / high | Screen 9 |
| financial\_load\_signal | text | low / medium / high | Screen 9 |
| nervous\_system\_state | text | wired / regulated / depleted / shut\_down | Screen 10 |
| energy\_level\_signal | text | strong / moderate / low / depleted | Screen 10 |

### **Behavioral Pattern**

| Field | Type | Values | Source |
| :---- | :---- | :---- | :---- |
| pressure\_response\_pattern | text | avoid / overthink / push\_through / seek\_help / variable | Screen 11 |
| non\_followthrough\_reason | text | motivation / overwhelm / distraction / wrong\_goal / waiting | Screen 11 |

### **Classification & Profile**

| Field | Type | Notes |
| :---- | :---- | :---- |
| classification\_type | text | One of 7 values — see Section 4 |
| pressure\_profile | text | Dynamic string — highest load \+ nervous system state |
| behavioral\_fingerprint | text | Plain English pattern label — see Section 4C |
| tradeoff\_statement | text | Plain English cost statement — see Section 4D |
| ai\_coaching\_mode | text | stabilizer / simplifier / strategist / rebuilder / protector |
| ai\_confidence\_level | text | exploratory / guided / direct — updates with each module completion |
| trajectory\_type | text | stabilizing / volatile / stuck / accelerating — null until first reassessment |
| modules\_completed\_count | number | 0 at onboarding. Increments with each module. Governs ai\_confidence\_level. |

### **Behavioral Flags**

| Field | Type | Default | Notes |
| :---- | :---- | :---- | :---- |
| recovery\_mode\_active | yes/no | no | Set yes from Screen 12 or Body Module |
| grief\_mode\_active | yes/no | no | Set yes from Screen 12 or History Module |
| trauma\_informed\_mode | yes/no | no | Set yes when trauma\_activation\_level \= active (History Module) |

### **Module Completion Flags**

| Field | Type | Set When |
| :---- | :---- | :---- |
| module\_body\_complete | yes/no | Body's Story module finishes |
| module\_financial\_complete | yes/no | Financial Reality module finishes |
| module\_identity\_complete | yes/no | Identity Lens module finishes |
| module\_relational\_complete | yes/no | Relational Blueprint module finishes |
| module\_history\_complete | yes/no | History & Context module finishes |
| module\_meaning\_complete | yes/no | What Holds You module finishes |

### **Module Data Fields — Create Now, Written Later**

| Field | Type | Module | Values / Notes |
| :---- | :---- | :---- | :---- |
| identity\_self\_worth\_source | text | Identity | performance\_based / approval\_based / inherent / unclear |
| identity\_narrative\_type | text | Identity | growth / fixed / mixed / unclear |
| identity\_role\_fusion\_score | number | Identity | 1–5 scale |
| identity\_pressure\_origin | text | Identity | self\_set / family / culture / survival / unclear |
| attachment\_signal | text | Relational | secure / anxious / avoidant / disorganized |
| conflict\_pattern | text | Relational | avoid / escalate / collapse / engage |
| support\_seeking\_capacity | text | Relational | high / medium / low / blocked |
| intimacy\_safety\_level | text | Relational | safe / mixed / unsafe / absent |
| trauma\_activation\_level | text | History | low / present / active / unsure |
| grief\_load\_level | text | History | low / moderate / high / unsure |
| prior\_support\_type | text | History | therapy / coaching / none / other |
| significant\_events\_12mo | text | History | Multi-value — store as comma-separated list |
| financial\_stability\_signal | text | Financial | stable / strained / crisis / rebuilding |
| financial\_anxiety\_level | text | Financial | low / medium / high |
| financial\_agency\_level | text | Financial | in\_control / somewhat / little / none |
| sleep\_quality\_signal | text | Body | good / fair / poor |
| hormonal\_context\_flag | yes/no | Body | yes if hormonal transition flagged |
| hormonal\_context\_type | text | Body | perimenopause / postpartum / other / none |
| chronic\_pain\_flag | yes/no | Body | yes if chronic pain or physical symptoms flagged |
| body\_relationship | text | Body | connected / neutral / disconnected / conflicted |
| substance\_pattern\_signal | text | Body | none / managed / concerning — separate from recovery flag |
| purpose\_clarity | text | Meaning | clear / searching / lost / rebuilding |
| spiritual\_framework\_present | yes/no | Meaning | yes if active faith or spiritual practice |
| spiritual\_framework\_type | text | Meaning | active / background / complicated / none / exploring |
| belonging\_level | text | Meaning | strong / moderate / weak / absent |
| pressure\_reach | text | Meaning | faith / people / work / substances / avoidance / solitude |

### **Phase 2 Fields — Create Now**

| Field | Type | Phase 2 Use |
| :---- | :---- | :---- |
| perception\_gap\_flag | text | none / under\_recognition / overextension / misalignment — Phase 2 detection |
| insight\_flags | text | Comma-separated list of active insight flags |
| session\_count | number | Total coaching sessions completed — Phase 2 behavior loop |
| streak\_days | number | Consecutive days of app engagement — Phase 2 habit tracking |
| last\_checkin\_date | date | Date of last daily check-in |
| micro\_commitment\_active | text | Current active micro-commitment text |
| micro\_commitment\_due | date | Due date for active micro-commitment |
| organization\_id | text | Phase 3 — link to Organization data type. Optional. Leave null for consumer users. |

| SECTION 3 — CORE ONBOARDING SURVEY — ALL 12 SCREENS |
| :---: |

|  | CRISIS BAR — ALL SCREENS In a crisis? Call 988 or text HOME to 741741 — Uncloud360 is coaching only, not emergency care. This bar must be visible on every onboarding screen at all times. It cannot be dismissed. |
| :---- | :---- |

## **Screen 1 — Welcome**

No step number · Landing

| Element | Content |
| :---- | :---- |
| Headline | Welcome. Let's understand how you're really doing. |
| Body | This isn't a test. It's a way for Uncloud360 to understand how you operate under pressure — so your coaching actually fits your life. The assessment takes about 10 minutes. Your answers shape your personalized dashboard, coaching tone, and the paths recommended for you. You can update your profile anytime as things change. |
| CTA | Get started → Screen 2 |
| Data Written | None |

## **Screen 2 — Name**

Step 1 of 12

| Element | Content |
| :---- | :---- |
| Headline | What should we call you? |
| Sub | This is how your AI coach will address you throughout your sessions. |
| Input | Single text field. Required. Continue disabled until field has value. |
| On Continue | Save first\_name. Navigate Screen 3\. |
| Note | From Screen 3 onward all \[Name\] references replace dynamically with first\_name. |

## **Screen 3 — Role**

Step 2 of 12 · CRITICAL: saves before Screen 6

| Element | Content |
| :---- | :---- |
| Headline | How would you describe your current primary role? |
| Sub | This helps us make sure the questions feel relevant to your actual life. |
| Input | 5 selectable cards. Single select. Continue disabled until selected. |
| On Continue | Save role\_type. Navigate Screen 4\. |

| Value | Card Label | Description |
| :---- | :---- | :---- |
| pro | Working professional or leader | Employed, running a business, or in a leadership role |
| student | Student | In school, university, or a training program |
| caregiver | Caregiver or stay-at-home parent | Primary caregiver for children, family members, or household |
| transition | Between jobs or in transition | Job searching, career changing, or in a period of change |
| retired | Retired or semi-retired | No longer working full time by choice or circumstance |

## **Screen 4 — Pillar**

Step 3 of 12

| Element | Content |
| :---- | :---- |
| Headline | Where is life feeling heaviest right now, \[Name\]? |
| Sub | You can access all three areas anytime. This just tells us where to focus first. |
| Input | 3 selectable cards. Single select. |
| On Continue | Save primary\_pillar. Navigate Screen 5\. |

| Value | Label | Description |
| :---- | :---- | :---- |
| emotional | Emotional well-being | Stress, relationships, grief, confidence, boundaries |
| professional | Professional | Career, leadership, growth, productivity, burnout at work |
| health | Health & wellness | Habits, recovery, sobriety, energy, daily routines |

## **Screen 5 — Stability**

Step 4 of 12 · PuP 360 Dimension 1 of 3 · Universal all roles

| Element | Content |
| :---- | :---- |
| Headline | How you're holding up emotionally |
| Sub | There are no right or wrong answers. Answer based on the past two to three weeks. |
| Input | 5 question cards. All 5 must be answered before Continue activates. |
| Important | Users see descriptive sentences only. Numeric value 1–5 stored invisibly. |
| On Continue | Save sq1–sq5. Calculate stability\_score \= avg(sq1–sq5) round 1 decimal. Navigate Screen 6\. |

| Q1  *Field: sq1* How well are you managing your stress levels day to day? |  |
| ----- | :---- |
| **1** | Barely managing — most days feel overwhelming |
| **2** | Struggling — stress is affecting my daily functioning |
| **3** | Getting by — some days are harder than others |
| **4** | Managing well — I have some good tools and routines |
| **5** | Thriving — stress feels manageable and I recover quickly |

| Q2  *Field: sq2* When something unexpected hits, how quickly do you recover emotionally? |  |
| ----- | :---- |
| **1** | I stay in it for a long time — it really takes me down |
| **2** | It takes days or weeks to feel like myself again |
| **3** | I bounce back, but it takes real effort |
| **4** | I recover within a day or two most of the time |
| **5** | I'm resilient — I process and move forward relatively quickly |

| Q3  *Field: sq3* How often do you feel like you're carrying more than you can sustainably hold? |  |
| ----- | :---- |
| **1** | Almost always — it feels like too much nearly every day |
| **2** | Often — it's my normal state lately |
| **3** | Sometimes — it comes in waves |
| **4** | Rarely — I feel mostly balanced |
| **5** | Almost never — my load feels sustainable |

| Q4  *Field: sq4* How would you rate your ability to set and maintain boundaries with others? |  |
| ----- | :---- |
| **1** | Very hard — I rarely say no and often feel taken advantage of |
| **2** | Difficult — I know I need better boundaries but struggle to set them |
| **3** | Moderate — I'm working on it, hit and miss |
| **4** | Good — I can usually hold my limits with some discomfort |
| **5** | Strong — I set and maintain boundaries with confidence |

| Q5  *Field: sq5* How supported do you feel by your social world right now — friendships, peers, community? |  |
| ----- | :---- |
| **1** | Very unsupported — I feel alone even when I'm around people |
| **2** | Mostly unsupported — my social connections feel thin or strained |
| **3** | Somewhat supported — I have some people but it doesn't feel like enough |
| **4** | Supported — I generally feel like I have people I can turn to |
| **5** | Very supported — my social world feels rich and genuinely nourishing |

## **Screen 6 — Performance (Role-Adaptive)**

Step 5 of 12 · Dimension 2 of 3 · performance\_score \= avg(pq1–pq5)

|  | BUBBLE BUILD NOTE Use conditional visibility on all 5 question cards and headline/sub based on Current User's role\_type. Answer options use same 1–5 structure and scoring for all roles. Only question text and screen headline change. |
| :---- | :---- |

**role\_type \= pro — Headline: How you're showing up professionally / Sub: Think about your work, your role, or whatever you consider your professional domain.**

| pq1  *Field: pq1* How clear are your goals and priorities right now? |  |
| ----- | :---- |
| **1** | No clarity — I don't know what I'm working toward |
| **2** | Foggy — I have a general idea but it's not defined |
| **3** | Somewhat clear — I know the direction but not the steps |
| **4** | Clear — I have goals and a rough plan |
| **5** | Very clear — I have specific goals, timelines, and priorities locked in |

| pq2  *Field: pq2* How consistent are you at following through on commitments to yourself? |  |
| ----- | :---- |
| **1** | Very inconsistent — I rarely follow through on what I plan |
| **2** | Inconsistent — I start strong but lose momentum quickly |
| **3** | Somewhat consistent — I follow through about half the time |
| **4** | Consistent — I generally do what I say I will |
| **5** | Very consistent — follow-through is a strength of mine |

| pq3  *Field: pq3* How effective do you feel in your professional role right now? |  |
| ----- | :---- |
| **1** | Not effective — I feel stuck or like I'm falling behind |
| **2** | Below where I want to be — I know I'm capable of more |
| **3** | Somewhat effective — doing okay but not at my best |
| **4** | Effective — performing well most of the time |
| **5** | Highly effective — operating at or near my best |

| pq4  *Field: pq4* How often do you feel productive versus just busy? |  |
| ----- | :---- |
| **1** | Almost always just busy — I'm exhausted but nothing meaningful gets done |
| **2** | Mostly busy — I feel active but not impactful |
| **3** | Mixed — some days are productive, some are just noise |
| **4** | Usually productive — I tend to spend time on what matters |
| **5** | Consistently productive — I protect my time and focus well |

| pq5  *Field: pq5* How would you describe your level of professional confidence right now? |  |
| ----- | :---- |
| **1** | Very low — I doubt myself constantly in professional situations |
| **2** | Low — I second-guess myself more than I should |
| **3** | Moderate — confident in some areas, shaky in others |
| **4** | Good — I generally trust my judgment and capability |
| **5** | Strong — I show up with confidence even under pressure |

**role\_type \= student — Headline: How you're showing up in your studies / Sub: Think about your academic life, coursework, and student role.**

| pq1  *Field: pq1* How clear are you on what you're working toward academically right now? |  |
| ----- | :---- |
| **1** | No clarity — I don't know why I'm here or what I'm working toward |
| **2** | Foggy — I have a general idea but haven't defined it |
| **3** | Somewhat clear — I know the direction but not the path |
| **4** | Clear — I have academic goals and a rough plan |
| **5** | Very clear — I know exactly what I'm working toward and why |

| pq2  *Field: pq2* How consistent are you at keeping up with your coursework and commitments? |  |
| ----- | :---- |
| **1** | Very inconsistent — I'm falling significantly behind |
| **2** | Inconsistent — I start strong but lose momentum quickly |
| **3** | Somewhat consistent — I manage about half the time |
| **4** | Consistent — I generally keep up with what's expected |
| **5** | Very consistent — I stay on top of everything and ahead where I can |

| pq3  *Field: pq3* How effective do you feel as a student right now? |  |
| ----- | :---- |
| **1** | Not effective — I feel like I'm failing or barely surviving |
| **2** | Below where I want to be — I know I'm capable of more |
| **3** | Somewhat effective — getting by but not at my best |
| **4** | Effective — performing well most of the time |
| **5** | Highly effective — operating at or near my full capacity |

| pq4  *Field: pq4* How often does your study time feel genuinely productive versus just time spent? |  |
| ----- | :---- |
| **1** | Almost never — I sit down but nothing really happens |
| **2** | Rarely — I feel like I'm going through the motions |
| **3** | Sometimes — some sessions work, others don't |
| **4** | Usually — I tend to make good use of my time |
| **5** | Consistently — I protect my focus and it shows in my work |

| pq5  *Field: pq5* How would you describe your academic confidence right now? |  |
| ----- | :---- |
| **1** | Very low — I doubt my ability to succeed most of the time |
| **2** | Low — I second-guess myself more than I should |
| **3** | Moderate — confident in some subjects, shaky in others |
| **4** | Good — I generally trust my ability and judgment |
| **5** | Strong — I back myself even in challenging academic situations |

**role\_type \= caregiver — Headline: How you're showing up in your role at home / Sub: Think about your daily responsibilities as a caregiver, parent, or household manager.**

| pq1  *Field: pq1* How clear are you on your priorities and what matters most in your role right now? |  |
| ----- | :---- |
| **1** | No clarity — most days feel reactive with no sense of direction |
| **2** | Foggy — I know what needs doing but not what actually matters most |
| **3** | Somewhat clear — I have priorities but they shift constantly |
| **4** | Clear — I have a good sense of what I'm focused on |
| **5** | Very clear — I know exactly what I'm working toward day to day |

| pq2  *Field: pq2* How consistent are you at following through on your intentions for the day? |  |
| ----- | :---- |
| **1** | Very inconsistent — most days go sideways before they start |
| **2** | Inconsistent — I plan but rarely execute the way I intended |
| **3** | Somewhat consistent — I manage about half the time |
| **4** | Consistent — I generally do what I set out to do |
| **5** | Very consistent — follow-through is a real strength in my role |

| pq3  *Field: pq3* How effective do you feel in your role as a caregiver or parent right now? |  |
| ----- | :---- |
| **1** | Not effective — I feel like I'm failing those who depend on me |
| **2** | Below where I want to be — I know I have more to give |
| **3** | Somewhat effective — doing okay but running low |
| **4** | Effective — showing up well for my family most of the time |
| **5** | Highly effective — I feel genuinely good about how I'm showing up |

| pq4  *Field: pq4* How often do you feel like you're making real progress versus just keeping up? |  |
| ----- | :---- |
| **1** | Almost never — every day is just survival mode |
| **2** | Rarely — I'm reacting more than I'm moving forward |
| **3** | Sometimes — occasional moments of progress between the chaos |
| **4** | Often — I feel like things are generally moving in the right direction |
| **5** | Consistently — I make meaningful progress regularly |

| pq5  *Field: pq5* How would you describe your confidence in your ability to manage your role right now? |  |
| ----- | :---- |
| **1** | Very low — I doubt myself constantly and feel like I'm failing |
| **2** | Low — I question my choices and approach more than I should |
| **3** | Moderate — confident in some areas, uncertain in others |
| **4** | Good — I generally trust my instincts and judgment |
| **5** | Strong — I back myself even when things are hard |

**role\_type \= transition — Headline: How you're navigating this period of change / Sub: Think about how you're managing this transition — your energy, direction, and forward momentum.**

| pq1  *Field: pq1* How clear are you on the direction you want to move toward? |  |
| ----- | :---- |
| **1** | No clarity — I genuinely don't know what's next |
| **2** | Foggy — I have some ideas but nothing feels solid |
| **3** | Somewhat clear — I have a direction but not a plan |
| **4** | Clear — I know what I'm moving toward and have started taking steps |
| **5** | Very clear — I have a defined goal and a concrete plan to get there |

| pq2  *Field: pq2* How consistent are you at taking productive steps forward during this time? |  |
| ----- | :---- |
| **1** | Very inconsistent — most days I'm stuck or going in circles |
| **2** | Inconsistent — I have bursts of effort but can't sustain them |
| **3** | Somewhat consistent — I make progress about half the time |
| **4** | Consistent — I'm taking meaningful steps most days |
| **5** | Very consistent — I'm actively and effectively moving my situation forward |

| pq3  *Field: pq3* How effectively do you feel you're navigating this transition? |  |
| ----- | :---- |
| **1** | Not effectively — I feel lost, stuck, or overwhelmed by it |
| **2** | Below where I want to be — I'm managing but not really moving |
| **3** | Somewhat effectively — making some progress but with a lot of friction |
| **4** | Effectively — handling this transition with reasonable clarity |
| **5** | Very effectively — I feel in control and making this work |

| pq4  *Field: pq4* How often do your days feel purposeful and structured during this period? |  |
| ----- | :---- |
| **1** | Almost never — my days feel empty or chaotic |
| **2** | Rarely — I have little structure and it's affecting me |
| **3** | Sometimes — some days have purpose, others feel aimless |
| **4** | Often — I've created enough structure to feel grounded most days |
| **5** | Consistently — my days have clear purpose and rhythm even now |

| pq5  *Field: pq5* How would you describe your confidence in yourself during this transition? |  |
| ----- | :---- |
| **1** | Very low — I'm doubting my abilities and worth significantly |
| **2** | Low — the uncertainty is shaking my belief in myself |
| **3** | Moderate — some days I feel capable, others I'm not sure |
| **4** | Good — I generally trust myself even in the uncertainty |
| **5** | Strong — I back myself and see this as an opportunity |

**role\_type \= retired — Headline: How you're shaping this chapter / Sub: Think about your daily engagement, purpose, and sense of effectiveness in this phase of life.**

| pq1  *Field: pq1* How clear are you on what gives your days meaning and purpose right now? |  |
| ----- | :---- |
| **1** | No clarity — I'm struggling to find what this chapter is for |
| **2** | Foggy — I have some ideas but nothing feels anchored |
| **3** | Somewhat clear — some things give me purpose, but it's not consistent |
| **4** | Clear — I have a good sense of what I value and pursue |
| **5** | Very clear — I have a strong sense of purpose and direction in this phase |

| pq2  *Field: pq2* How consistent are you at engaging with the things that matter most to you? |  |
| ----- | :---- |
| **1** | Very inconsistent — I rarely follow through on my intentions |
| **2** | Inconsistent — I intend to engage but often don't |
| **3** | Somewhat consistent — I engage meaningfully about half the time |
| **4** | Consistent — I regularly invest time in what matters to me |
| **5** | Very consistent — I am actively and intentionally engaged every day |

| pq3  *Field: pq3* How effective do you feel at shaping this chapter of your life? |  |
| ----- | :---- |
| **1** | Not effective — this phase feels like it's happening to me |
| **2** | Below where I'd like — I'm not making it what I hoped |
| **3** | Somewhat effective — there are good parts but I'm not fully there |
| **4** | Effective — I'm creating a life I generally feel good about |
| **5** | Highly effective — I'm living this phase with intention and satisfaction |

| pq4  *Field: pq4* How often does your time feel well spent and meaningful? |  |
| ----- | :---- |
| **1** | Almost never — most days feel empty or unstructured |
| **2** | Rarely — I'm filling time more than living it |
| **3** | Sometimes — meaningful moments exist but aren't consistent |
| **4** | Often — most days feel worthwhile |
| **5** | Consistently — I feel genuinely good about how I spend my time |

| pq5  *Field: pq5* How would you describe your sense of confidence and capability in this phase? |  |
| ----- | :---- |
| **1** | Very low — I feel diminished or without purpose |
| **2** | Low — I'm questioning my relevance and capability more than I'd like |
| **3** | Moderate — confident in some areas, uncertain about others |
| **4** | Good — I generally feel capable and valuable |
| **5** | Strong — I bring real experience and confidence to this chapter |

## **Screen 7 — Alignment**

Step 6 of 12 · Dimension 3 of 3 · Universal

| Element | Content |
| :---- | :---- |
| Headline | How aligned your life feels |
| Sub | This looks at how your daily life matches who you are and where you want to go. |
| On Continue | Save aq1–aq5. Calculate alignment\_score \= avg(aq1–aq5) round 1 decimal. Navigate Screen 8\. |

| Q11  *Field: aq1* How aligned do your daily actions feel with your core values right now? |  |
| ----- | :---- |
| **1** | Very misaligned — I'm living in a way that doesn't reflect who I am |
| **2** | Mostly misaligned — I feel off track from what matters to me |
| **3** | Somewhat aligned — some things fit, others feel off |
| **4** | Mostly aligned — my life generally reflects my values |
| **5** | Fully aligned — how I live reflects who I am and what I believe |

| Q12  *Field: aq2* How sustainable are your current daily habits and routines? |  |
| ----- | :---- |
| **1** | Not sustainable — I have no real structure and it's catching up with me |
| **2** | Barely — I have some routines but they're fragile |
| **3** | Somewhat — I have a foundation but need more consistency |
| **4** | Mostly sustainable — my habits generally support me |
| **5** | Very sustainable — my routines are solid and serve me well |

| Q13  *Field: aq3* How purposeful does your life feel right now? |  |
| ----- | :---- |
| **1** | Not at all — I feel like I'm just going through the motions |
| **2** | Rarely — I've lost the thread of what I'm working toward |
| **3** | Sometimes — I catch glimpses of purpose but it's not consistent |
| **4** | Often — I have a sense of direction that guides most of my choices |
| **5** | Deeply — I feel a clear sense of meaning and direction |

| Q14  *Field: aq4* How would you rate your physical health habits over the past few weeks — sleep, movement, nutrition? |  |
| ----- | :---- |
| **1** | Poor — I'm neglecting my body and it's showing |
| **2** | Below average — I know what I need to do but I'm not doing it |
| **3** | Average — some areas are okay, others need work |
| **4** | Good — I'm taking care of myself most of the time |
| **5** | Very good — my physical habits are a strength right now |

| Q15  *Field: aq5* How satisfied are you with the overall direction your life is heading? |  |
| ----- | :---- |
| **1** | Very unsatisfied — I feel lost or like things are going the wrong way |
| **2** | Unsatisfied — I sense something needs to change significantly |
| **3** | Neutral — not unhappy, but not where I want to be either |
| **4** | Satisfied — things are generally moving in the right direction |
| **5** | Very satisfied — I feel genuinely good about where I'm headed |

## **Screen 8 — Orientation**

Step 7 of 12 · Classification input only — does NOT affect S/P/A scores

| Element | Content |
| :---- | :---- |
| Headline | When you think about where you are right now, which feels most true? |
| Input | Single-select radio. One required to continue. |
| On Continue | Save orientation\_score. Navigate Screen 9\. |

| Value | Answer Text |
| :---- | :---- |
| 1 | I need to stabilize — I'm not thinking about growth right now |
| 2 | Something isn't working and I need to figure out what |
| 3 | Things are okay — I'm not sure I need much to change |
| 4 | I want to be meaningfully further along than I am now |
| 5 | I'm ready to push hard to the next level |

## **Screen 9 — Load Signals**

Step 8 of 12 · Surface pressure mapping — NEW in v2

| Element | Content |
| :---- | :---- |
| Headline | Let's understand what's pressing on you right now, \[Name\]. |
| Sub | These help your coach understand your context. Be honest, not optimistic. |
| Input | 4 three-option select questions. All 4 required before Continue activates. |
| On Continue | Save cognitive\_load\_signal, relational\_load\_signal, environmental\_load\_signal, financial\_load\_signal. Navigate Screen 10\. |

| \# | Field | Question | Low | Medium | High |
| :---- | :---- | :---- | :---- | :---- | :---- |
| L1 | cognitive\_load\_signal | How much mental noise are you dealing with — racing thoughts, rumination, decision fatigue? | Mind feels clear most of the time | Some noise but manageable | Head rarely feels quiet — constant |
| L2 | relational\_load\_signal | How much are your relationships adding to your stress right now? | Relationships feel mostly supportive | Some friction but manageable | Significant conflict or strain in key relationships |
| L3 | environmental\_load\_signal | How much pressure are logistics and time creating — schedule, responsibilities, deadlines? | Life feels mostly manageable | Stretched but coping | Overwhelmed by practical demands |
| L4 | financial\_load\_signal | How much is financial stress affecting your day-to-day mental state? | Financial situation feels stable | Some financial worry but not consuming | Financial stress is significant daily presence |

## **Screen 10 — State Signals**

Step 9 of 12 · How your body is holding it — NEW in v2

| Element | Content |
| :---- | :---- |
| Headline | How is your body holding everything right now, \[Name\]? |
| Sub | This isn't about fitness. It's about how your system is responding to what you're carrying. |
| Input | 2 single-select questions. Both required before Continue activates. |
| On Continue | Save nervous\_system\_state and energy\_level\_signal. Navigate Screen 11\. |

| S1  *Field: nervous\_system\_state* Which best describes how your nervous system feels most of the time right now? |  |
| ----- | :---- |
| **wired** | On edge, anxious, or tightly wound — like I'm braced for something |
| **regulated** | Mostly calm and stable — I feel grounded most days |
| **depleted** | Exhausted and flat — I have no reserves left |
| **shut\_down** | Numb or disconnected — I'm going through the motions |

| S2  *Field: energy\_level\_signal* How would you describe your energy levels over the past two to three weeks? |  |
| ----- | :---- |
| **strong** | Strong — I have real energy available most days |
| **moderate** | Moderate — enough to function but not much surplus |
| **low** | Low — I'm running on fumes more days than not |
| **depleted** | Depleted — I'm exhausted even when I sleep |

## **Screen 11 — Behavioral Pattern**

Step 10 of 12 · How you respond under pressure — NEW in v2

|  | WHY THIS MATTERS Two users with identical scores make completely different choices under pressure. This is what determines whether coaching produces awareness or actual behavior change. |
| :---- | :---- |

| Element | Content |
| :---- | :---- |
| Headline | Last two questions, \[Name\] — these are about how you actually respond. |
| Sub | There is no right answer. The most useful answer is the most honest one. |
| Input | 2 single-select questions. Both required. |
| On Continue | Save pressure\_response\_pattern and non\_followthrough\_reason. Navigate Screen 12\. |

| B1  *Field: pressure\_response\_pattern* When something feels hard or overwhelming, you tend to: |  |
| ----- | :---- |
| **avoid** | Put it off — deal with it later or hope it resolves |
| **overthink** | Think about it extensively before acting — sometimes too long |
| **push\_through** | Move immediately — push through regardless of how I feel |
| **seek\_help** | Reach out — I look for input or support before deciding |
| **variable** | It depends entirely on the situation — I don't have a consistent pattern |

| B2  *Field: non\_followthrough\_reason* When you don't follow through on something you intended to do, it's usually because: |  |
| ----- | :---- |
| **motivation** | I lose motivation once it gets hard or progress feels slow |
| **overwhelm** | I get overwhelmed and shut down — too much, too hard |
| **distraction** | Other things pull my attention and reprioritize my day |
| **wrong\_goal** | I'm not sure it was the right goal or priority to begin with |
| **waiting** | I'm waiting for the right moment, more information, or better conditions |

## **Screen 12 — Health & Wellness Flags**

Step 11 of 12 · Behavioral modifiers — not scores

| Element | Content |
| :---- | :---- |
| Headline | Is there anything in your health journey — or life situation — you'd like your coach to be aware of? |
| Sub | Completely optional and entirely private. Select any that apply. |
| Input | Multi-select checkboxes. None of the above deselects all others. At least one selection required. |
| On Continue | Write flag fields. Run Classification Logic. Navigate Screen 13\. |

| Field Written | Option Text | Effect |
| :---- | :---- | :---- |
| recovery\_mode\_active \= yes | I'm in recovery from substance use | Governs AI prompts, path assignment, crisis trigger sensitivity in all sessions |
| grief\_mode\_active \= yes | I'm navigating a significant loss or life disruption — divorce, bereavement, illness, family crisis | Modifies AI tone, surfaces grief paths, increases emotional sensitivity across all sessions |
| No field — MVP | I'm navigating an eating or body image challenge | Note in coaching context — Phase 2 field |
| No field — MVP | I'm managing a chronic health condition | Note in coaching context — Phase 2 field |
| No field — MVP | I'm supporting a family member through something difficult | Note in coaching context |
| No field — MVP | I'd prefer to share this in coaching when I'm ready | No field written. Proceeds normally. |
| No field | None of the above | Deselects all. Proceeds normally. |

| SECTION 4 — CLASSIFICATION LOGIC |
| :---: |

|  | WHEN TO RUN Run immediately after Screen 12 completes, before Results screen loads. All scores and all Load/State/Behavioral fields must be saved. Run Parts A through F in order. |
| :---- | :---- |

## **Part A — Primary Classification**

Evaluate top to bottom. Apply FIRST match. Stop on match. Save to classification\_type.

| Rule | Classification | Condition | Coaching Priority |
| :---- | :---- | :---- | :---- |
| 1 | High Output / Hidden Instability | performance\_score \>= 4.0 AND stability\_score \< 3.2 | Performance sustainability — check before Rule 2 |
| 2 | Capacity Erosion | stability\_score \< 3.2 (not Rule 1\) | Stabilization before everything else |
| 3 | Performance Stagnation | performance\_score \< 3.2 | Clarity, structure, accountability |
| 4 | Alignment Fracture | alignment\_score \< 3.2 | Identity, purpose, habit work |
| 5 | Optimization Ready | ALL three scores \>= 3.8 | Expansion, growth, edge refinement |
| 6 | Comfortable Plateau | ALL three \>= 3.0 AND \<= 3.5 AND orientation\_score \<= 3 | Gentle surface — what okay is costing |
| 7 | Building Momentum | Does not match any above | Consistency and highest-leverage action |

## **Part B — Pressure Profile**

Identify highest load signal. Combine with nervous\_system\_state. Save to pressure\_profile as plain text string.

| Highest Load | State | Pressure Profile String |
| :---- | :---- | :---- |
| cognitive\_load \= high | wired | Cognitive Overload \+ Wired Nervous System |
| cognitive\_load \= high | depleted | Cognitive Overload \+ Depleted |
| relational\_load \= high | any | Relational Strain \+ \[state value\] |
| environmental\_load \= high | any | Logistical Overwhelm \+ \[state value\] |
| financial\_load \= high | any | Financial Stress \+ \[state value\] |
| All medium or low | regulated | Low Pressure / Regulated |
| All medium or low | wired | Low External Load / Wired — investigate in session |
| Two loads tied at high | any | \[Load1\] \+ \[Load2\] Pressure \+ \[state\] |

## **Part C — Behavioral Fingerprint**

Combine pressure\_response\_pattern \+ non\_followthrough\_reason. Save plain English string to behavioral\_fingerprint.

| Pressure Response | Non-Followthrough | Behavioral Fingerprint |
| :---- | :---- | :---- |
| avoid | waiting | Avoidant / Conditional — delays until conditions feel perfect |
| avoid | overwhelm | Avoidant / Shutdown — withdraws when load exceeds capacity |
| avoid | wrong\_goal | Avoidant / Misaligned — avoids because goal isn't actually right |
| overthink | motivation | Analytical / Motivation Gap — insight-rich, execution-poor |
| overthink | wrong\_goal | Analytical / Direction Seeker — overthinks because goal feels unclear |
| overthink | overwhelm | Analytical / Paralyzed — analysis loops when overwhelmed |
| push\_through | motivation | Driver / Depletion Risk — pushes until fuel runs out |
| push\_through | overwhelm | Driver / Capacity Ceiling — high output until wall hits |
| push\_through | distraction | Driver / Scattered — effortful but not focused |
| seek\_help | distraction | Collaborative / Diffuse Focus — support-dependent, easily redirected |
| seek\_help | wrong\_goal | Collaborative / Direction Seeker — uses others to find right path |
| seek\_help | motivation | Collaborative / Sustain Gap — needs external energy to maintain |
| variable | any | Situationally Adaptive — no dominant pattern, context-dependent |

## **Part D — Tradeoff Statement**

Generate plain English cost statement based on classification\_type. Save to tradeoff\_statement. Display prominently on Results screen and in early coaching sessions.

| Classification | Tradeoff Statement |
| :---- | :---- |
| High Output / Hidden Instability | Your performance is being funded by your stability. Output is high — but the internal cost is rising. |
| Capacity Erosion | Right now, functioning is the goal. Growth costs energy you don't currently have to spend. |
| Performance Stagnation | Capability isn't the gap. Something between knowing and doing is where the work lives. |
| Alignment Fracture | You may be performing or surviving — but something off at a deeper level is driving all the friction. |
| Optimization Ready | Your foundation is solid. The risk now is staying comfortable when you're genuinely ready to stretch. |
| Comfortable Plateau | Okay took real work to get to. But something brought you here — and okay usually has a quiet cost. |
| Building Momentum | You're in the transition zone. Not in crisis, not yet where you want to be. The gap is consistency. |

## **Part E — AI Coaching Mode**

Set ai\_coaching\_mode. Protector always overrides. Simplifier stacks with other modes.

| Condition | Mode | Tone |
| :---- | :---- | :---- |
| grief\_mode\_active \= yes OR recovery\_mode\_active \= yes | protector | Highly empathetic, slow, safe — always overrides all other modes |
| stability \< 3.2 OR nervous\_system \= depleted OR shut\_down | stabilizer | Calm, grounding, validating — stabilization before action |
| cognitive\_load \= high (any classification) | simplifier | Clear, minimal, structured — reduce inputs and decisions. Stacks with other modes. |
| alignment \< 3.2 OR classification \= Alignment Fracture | rebuilder | Reflective, deep questioning, identity-focused |
| performance \>= 3.8 AND nervous\_system \= regulated | strategist | Direct, challenging, future-focused — growth and leverage |

## **Part F — AI Confidence Level**

Set initial ai\_confidence\_level \= exploratory at onboarding. Recalculate each time modules\_completed\_count changes.

| Modules Complete | Level | Gidget Behavior |
| :---- | :---- | :---- |
| 0 | exploratory | Curious questions, avoids strong assumptions, actively gathers missing context in session |
| 1–2 | exploratory+ | Makes informed observations, notes gaps, probes missing layers |
| 3–4 | guided | Informed suggestions, pattern recognition, confronts gently with evidence |
| 5–6 | direct | Full pattern recognition, direct interventions, confident challenge when appropriate |

| SECTION 5 — RESULTS SCREEN |
| :---: |

Step 12 of 12 · Auto-generated from User fields. This screen is the first payoff. It must feel like a revelation, not a report card.

## **Required Display Elements — In Order**

| Element | Content / Logic | Notes |
| :---- | :---- | :---- |
| Headline | Here's what we're seeing, \[first\_name\]. | Dynamic — uses first\_name |
| Score Gauges | Three bars: stability\_score, performance\_score, alignment\_score — each as decimal and % of 5 filled bar | Color code: red \< 3.2, amber 3.2–3.7, green \>= 3.8 |
| Pressure Profile Pill | Display pressure\_profile value as labeled badge | Shown below gauges |
| Tradeoff Statement | Display tradeoff\_statement in highlighted callout — first honest mirror | Most important element on screen |
| Recovery Pill | If recovery\_mode\_active \= yes: 'Recovery Mode Active' indicator pill | Green pill, visible above classification card |
| Grief Pill | If grief\_mode\_active \= yes: 'Grief-Informed Coaching Active' indicator pill | Soft blue pill |
| Classification Card | classification\_type name \+ description text \+ 3 focus area bullets | See descriptions below |
| What Happens Next | Static 4-item list: dashboard personalization, AI adaptation, path recommendations, 90-day reassessment | Builds anticipation for app |
| Module Preview | 'Your first deep-dive: \[Module Name\] — available in \[X\] days' | Based on trigger schedule |
| CTA Button | Go to my dashboard → triggers completion workflow | Primary action |

## **Classification Descriptions for Results Screen**

| Classification | Display Description |
| :---- | :---- |
| Capacity Erosion | Your internal capacity is being stretched beyond what's sustainable right now. This isn't a character flaw — it's a system under load. The first priority is stabilization, not optimization. |
| Performance Stagnation | You have capability — but something is blocking your ability to execute consistently right now. Whether it's clarity, confidence, or follow-through, the coaching will meet you where the gap actually is. |
| Alignment Fracture | There's a gap between how you're living and what actually matters to you. You may be performing or surviving — but something feels off at a deeper level. This is where your coaching will focus. |
| High Output / Hidden Instability | You're producing at a high level — but your internal stability isn't keeping pace with your output. This is one of the most common and most overlooked patterns. The goal isn't to slow down. It's to make your performance sustainable. |
| Optimization Ready | You're operating from a solid foundation across all three dimensions. The work now is about expanding your capacity, refining your edge, and sustaining what you've built. |
| Comfortable Plateau | Things are okay — and okay took real work to get to. But something brought you here, which usually means part of you knows that okay isn't quite enough. Your coaching will gently surface what you've been sitting with. |
| Building Momentum | You're in a transition zone — not in crisis, but not yet where you want to be. You know you want more and you're ready to work for it. Your coaching will focus on building consistency and identifying highest-leverage areas for growth. |

| SECTION 6 — COMPLETION WORKFLOW |
| :---: |

Fires when user clicks 'Go to my dashboard'. Run steps in exact order.

| Step | Action | Logic / Notes |
| :---- | :---- | :---- |
| 1 | onboarding\_complete \= yes | Gates main app access |
| 2 | assessment\_date \= current date/time | Starts 90-day reassessment clock |
| 3 | modules\_completed\_count \= 0 | Initialize module counter |
| 4 | ai\_confidence\_level \= exploratory | Initial coaching confidence |
| 5 | streak\_days \= 0 | Initialize engagement streak |
| 6 | Path assignment — primary | Query GuidedPath where pillar \= primary\_pillar AND classification \= classification\_type AND tier \= Free. Enroll user in all matching paths. |
| 7 | Path assignment — flags | If recovery\_mode\_active \= yes: enroll in Recovery Roadmap regardless of pillar. If grief\_mode\_active \= yes: enroll in Navigating Grief and Loss regardless of pillar. |
| 8 | Schedule modules | Set module trigger dates based on trigger schedule in Section 10\. Store as scheduled notifications. |
| 9 | Schedule 90-day reassessment | Set reassessment\_due\_date \= assessment\_date \+ 90 days |
| 10 | Navigate | Send to main dashboard |

| SECTION 7 — DASHBOARD SPECIFICATION |
| :---: |

|  | BUILD RULE The dashboard is NOT a generic layout. It is a dynamic interface governed by classification\_type, primary\_pillar, and flag fields. Every zone described below has conditional logic. No hardcoded content. |
| :---- | :---- |

## **Dashboard Zones — Universal Layout**

| Zone | Name | Always Shows |
| :---- | :---- | :---- |
| A | Header / Greeting | Good \[morning/afternoon/evening\], \[first\_name\] · classification badge · pressure\_profile tag |
| B | Tradeoff Reminder | tradeoff\_statement — prominent in first 30 days, secondary after |
| C | Score Summary | Three gauges: stability, performance, alignment — color coded by range |
| D | Primary Coaching Focus | Card for primary\_pillar — score, active path, Continue CTA |
| E | Active Paths | All enrolled paths with progress and Continue CTA |
| F | Your Coach | Gidget session CTA — shows current ai\_coaching\_mode label |
| G | Module Unlock | Next available module preview — Know Yourself Deeper |
| H | Daily Check-in | 3-question pulse — feeds trajectory tracking |
| I | Crisis Bar | In a crisis? Call 988 — always visible, cannot dismiss |

## **Dashboard Modifications by Classification**

### **Capacity Erosion**

* Crisis bar: make extra prominent — do not reduce or hide

* Zone B — Tradeoff: shown always, not de-emphasized at 30 days

* Zone C — Scores: de-emphasize Performance gauge. Stability is primary.

* Zone D — Primary Focus: always shows Emotional pillar path regardless of primary\_pillar selection

* Zone F — Gidget CTA: 'A space to be heard — no pressure, no agenda'

* Zone H — Check-in: reduce to 1 question. Simplify language. No urgency.

* Paths surfaced: Stress Regulation Foundations first. Emotional Recovery Toolkit second.

* No stretch goals. No performance metrics. No productivity language anywhere.

### **Performance Stagnation**

* Zone B: show tradeoff with action-forward framing

* Zone C: Performance gauge emphasized with color and size

* Zone D: goal clarity widget surfaced. Active commitments tracker visible.

* Zone F: 'Let's get unstuck — your coach is ready'

* Zone H: include follow-through question daily ('Did you do the thing?')

* Paths surfaced: Clarity & Priority Reset first. Follow-Through Systems second.

### **Alignment Fracture**

* Zone B: tradeoff framed around identity not productivity

* Zone D: values reflection prompt surfaced alongside path

* Zone F: 'Let's find the thread — what actually matters to you'

* Zone G: Identity Lens and What Holds You modules surfaced prominently

* Paths surfaced: Values Excavation first. Purpose Discovery second.

### **High Output / Hidden Instability**

* Zone B: tradeoff statement very prominent — 'Your performance is being funded by your stability'

* Zone C: stability score shown in red with warning indicator if \< 3.0

* Stability path surfaced alongside performance paths — both visible

* Zone F: 'Your output is real. Let's make it sustainable.'

* Paths surfaced: Burnout Prevention & Recovery first. Stress Regulation second.

### **Optimization Ready**

* Zone B: tradeoff framed as opportunity — 'The risk is staying comfortable'

* Zone C: all three scores shown with pride — full color green

* Premium path upsell prominent — 'Ready for the next level?'

* Zone F: 'You're in a strong position. Let's identify your next edge.'

* Paths surfaced: Strategic Focus System first. Leadership Under Pressure or equivalent second.

### **Comfortable Plateau**

* Zone B: soft framing — 'You've worked hard to get to okay. Something's worth looking at.'

* No urgency language anywhere on dashboard

* Zone H: check-in includes 'What would make today feel more like yours?'

* Paths surfaced: Life Direction Reset first. Values Excavation second.

### **Building Momentum**

* Zone C: progress tracking prominent — delta from start shown after first 30 days

* Consistency streak tracker visible in header zone

* Zone F: 'You're ready to move. Let's find your highest leverage.'

* Paths surfaced: Follow-Through Systems first. Then classification-relevant path.

## **Dashboard Modifications by Active Flags**

| Flag Active | Modification |
| :---- | :---- |
| recovery\_mode\_active | Recovery Roadmap path pinned to top of Zone E. Gidget session always opens with sobriety-aware check-in. Crisis bar shows both 988 and SAMHSA hotline. |
| grief\_mode\_active | Navigating Grief and Loss path pinned to Zone E. Zone F CTA softened: 'No pressure — I'm here when you're ready.' Zone H check-in reduced to 1 gentle question. |
| trauma\_informed\_mode | All challenge language softened across dashboard. Gidget CTA uses 'at your pace' framing. No urgency in any element. |

| SECTION 8 — COMPLETE PATH LIBRARY |
| :---: |

Paths are structured content journeys. Each path has a pillar, a classification match, a tier, and a content description. Paths are stored in a GuidedPath data type. Build the data type before building path content.

## **GuidedPath Data Type — Required Fields**

| Field | Type | Notes |
| :---- | :---- | :---- |
| path\_name | text | Display name |
| pillar | text | emotional / professional / health / alignment (cross-pillar) |
| classification\_match | list of text | Which classification types this path is assigned to at onboarding |
| trigger\_signals | text | Additional triggers beyond classification — e.g. low sq5, high relational load |
| tier | text | free / pro / premium |
| length\_weeks | number | Estimated completion in weeks |
| session\_count | number | Number of sessions in path |
| description | text | Short description shown on path card |
| coach\_mode | text | Which Gidget mode this path operates in |
| phase | number | 1 \= live at launch, 2 \= Phase 2, 3 \= Phase 3 |

## **Free Tier Paths — Phase 1**

### **Emotional Well-being Pillar**

| Path Name | Classification Match | Trigger Signals | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Stress Regulation Foundations | Capacity Erosion · High Output/Hidden Instability · All | Any stability\_score \< 3.5 | 4 weeks · 8 sessions | Core emotional regulation tools. Breathing, pattern recognition, nervous system basics. First path for most Capacity Erosion users. |
| Emotional Recovery Toolkit | Capacity Erosion · Building Momentum | Recovery from setback signal | 3 weeks · 6 sessions | Bounce-back tools for after difficult periods. Builds resilience and re-entry confidence. |
| Boundary Basics | All classifications | sq4 \< 3 | 3 weeks · 6 sessions | Introduction to boundary-setting. Language, scripts, and the belief work underneath. |
| Navigating Grief and Loss | All | grief\_mode\_active \= yes | 6 weeks · 12 sessions | Dedicated grief path. Trauma-informed pacing. No timeline pressure. Auto-enrolled on flag. |

### **Professional Pillar**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Clarity & Priority Reset | Performance Stagnation · Building Momentum | pq1 \< 3 | 3 weeks · 6 sessions | Goal excavation and priority architecture. Moves from foggy to focused. |
| Follow-Through Systems | Performance Stagnation · Building Momentum | pq2 \< 3 | 4 weeks · 8 sessions | Execution architecture. Why you don't follow through and how to change the pattern. |
| Burnout Awareness | High Output/Hidden Instability · Capacity Erosion | pq4 \< 3 AND sq1 \< 3 | 3 weeks · 6 sessions | Recognize burnout early. Introduce sustainability thinking. Reframe rest as performance data. |

### **Health & Wellness Pillar**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Habit Foundation Builder | Alignment Fracture · Capacity Erosion | aq2 \< 3 | 4 weeks · 8 sessions | Build one sustainable habit at a time. Low-friction entry. Designed for depleted nervous systems. |
| Recovery Roadmap | All | recovery\_mode\_active \= yes | 12 weeks · 24 sessions | Sobriety and recovery support path. Trauma-informed. SAMHSA-aligned framing. Auto-enrolled. |
| Sleep & Recovery Basics | All | sleep\_quality\_signal \= poor OR energy \= depleted | 3 weeks · 6 sessions | Sleep hygiene, recovery protocols, rest as strategy. First path for depleted state users. |

## **Pro Tier Paths — Phase 1**

### **Emotional Well-being Pillar**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Nervous System Regulation | Capacity Erosion · High Output/Hidden Instability | nervous\_system \= wired | 5 weeks · 10 sessions | Advanced nervous system work. Polyvagal-informed. Somatic techniques. For wired-state users. |
| Inner Critic to Inner Coach | Alignment Fracture · Capacity Erosion | module\_identity\_complete \+ identity\_narrative\_type \= fixed | 6 weeks · 12 sessions | Identity-level work on self-talk, internalized criticism, and self-worth source. Requires Identity Lens module. |
| Relationship Reset | All | relational\_load\_signal \= high | 5 weeks · 10 sessions | Repair and restructure strained relationships. Communication, conflict, and emotional safety. |
| Social Connection Architecture | All | sq5 \< 2.5 | 4 weeks · 8 sessions | Build meaningful social connection. For users who feel isolated even around others. |

### **Professional Pillar**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Leadership Under Pressure | Optimization Ready · High Output/Hidden Instability | role\_type \= pro AND performance \>= 3.8 | 6 weeks · 12 sessions | High-performance leadership coaching. Presence, decision-making, and leading through uncertainty. |
| Career Transition Navigator | Building Momentum · Performance Stagnation | role\_type \= transition | 6 weeks · 12 sessions | Career change, job search, and identity rebuild during professional transition. |
| Confidence Architecture | Performance Stagnation · Building Momentum | pq5 \< 3 | 5 weeks · 10 sessions | Self-trust, imposter syndrome, and professional confidence. Requires Identity Lens module for full depth. |
| From Busy to Effective | Performance Stagnation · High Output/Hidden Instability | cognitive\_load \= high AND pq4 \< 3 | 4 weeks · 8 sessions | Focus architecture. Time protection. Meaningful vs. motion work. |
| Strategic Focus System | Optimization Ready · Building Momentum | performance \>= 3.5 AND cognitive\_load \= medium | 5 weeks · 10 sessions | Highest-leverage identification. 80/20 in practice. For users ready to operate strategically. |

### **Health & Wellness Pillar**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Energy Management System | Capacity Erosion · High Output/Hidden Instability | energy \= low OR depleted | 5 weeks · 10 sessions | Sustainable energy architecture. Depletion patterns, recovery protocols, energy budgeting. |
| Body Reconnection | All | body\_relationship \= disconnected OR conflicted | 5 weeks · 10 sessions | Rebuild relationship with physical body. Somatic awareness, movement as regulation tool. |
| Financial Stress Navigation | All | financial\_load\_signal \= high OR financial\_stability\_signal \= crisis | 4 weeks · 8 sessions | Practical financial stress coaching. Scarcity mindset, agency rebuilding, prioritization under constraint. |

### **Alignment — Cross-Pillar Pro Paths**

| Path Name | Classification Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| Values Excavation | Alignment Fracture · Comfortable Plateau | alignment\_score \< 3.5 | 5 weeks · 10 sessions | Deep values clarification. What actually matters, how to use values as decision architecture. |
| Purpose Discovery | Alignment Fracture · Building Momentum | purpose\_clarity \= searching OR lost | 6 weeks · 12 sessions | Find and articulate purpose. Requires What Holds You module. Meaning-based framework. |
| Life Direction Reset | Comfortable Plateau · Building Momentum | orientation\_score \<= 3 AND alignment \<= 3.5 | 5 weeks · 10 sessions | Gentle challenge of status quo. For users who sense something is off but can't name it. |
| Identity After Role Loss | Building Momentum · Capacity Erosion | role\_type \= transition OR retired | 5 weeks · 10 sessions | Who am I without the title? Identity rebuild after career, role, or life structure change. |

## **Premium Paths — Phase 1**

| Path Name | Match | Trigger | Length | Description |
| :---- | :---- | :---- | :---- | :---- |
| High Performance Sustainability | High Output/Hidden Instability | performance \>= 4.0 AND stability \< 3.2 | 8 weeks · 16 sessions | Flagship path for high performers. Integrate performance and wellbeing. Prevent burnout from peak output. |
| The Optimization Protocol | Optimization Ready | All three scores \>= 3.8 | 8 weeks · 16 sessions | Elite performance path. Full-spectrum optimization. Best self operating at best. |
| Deep Identity Work | All | module\_identity\_complete AND identity\_role\_fusion\_score \>= 4 | 8 weeks · 16 sessions | Advanced identity deconstruction and rebuild. For users whose sense of self is fused with their role or achievement. |

| SECTION 9 — DEEP-DIVE MODULES — COMPLETE QUESTION SETS |
| :---: |

|  | DELIVERY RULE Modules are surfaced as 'Know Yourself Deeper — \[Module Name\]'. Always optional. Always available in user profile under this label. Modules are never required for app access. Each module must feel valuable on its own — not like more onboarding. |
| :---- | :---- |

## **Module 1 — The Identity Lens**

| Property | Detail |
| :---- | :---- |
| Length | 10 minutes · 8 questions |
| Default Trigger | Day 7 |
| Accelerated Trigger | Day 5 if performance \< 3.2 AND overthink or avoid pattern detected |
| Headline | Who you believe you are shapes everything else |
| Sub | This goes deeper than roles or responsibilities. These 8 questions look at the beliefs underneath your behavior. |
| Fields Written | identity\_self\_worth\_source · identity\_narrative\_type · identity\_role\_fusion\_score · identity\_pressure\_origin · module\_identity\_complete \= yes · modules\_completed\_count \+ 1 |

| IQ1  *Field: identity\_self\_worth\_source* Where does most of your sense of self-worth come from right now? |  |
| ----- | :---- |
| **performance\_based** | What I achieve — my worth tracks with my output and results |
| **approval\_based** | How others see me — I feel good about myself when I'm validated by others |
| **inherent** | Who I am — my worth doesn't change based on what I do or what others think |
| **unclear** | I'm not sure — it shifts or I haven't thought about it this way before |

| IQ2  *Field: identity\_narrative\_type* When you face a real setback, which internal story tends to take over? |  |
| ----- | :---- |
| **growth** | This is information — I can learn from this and adjust how I move forward |
| **fixed** | This confirms something I already believed about my limits |
| **mixed** | It depends — sometimes I recover the narrative, sometimes I don't |
| **unclear** | I'm not sure I'm aware of a consistent story when things go wrong |

| IQ3  *Field: identity\_role\_fusion\_score* How much of your sense of identity is tied to your role — your job, title, or function? |  |
| ----- | :---- |
| **1** | Very little — who I am feels separate from what I do |
| **2** | Some — my role is part of me but not most of me |
| **3** | Significant — my role is a major part of how I see myself |
| **4** | Very high — I struggle to separate who I am from what I do |
| **5** | Total — I don't know who I am outside of this role |

| IQ4  *Field: identity\_pressure\_origin* Where did the standards you hold yourself to originally come from? |  |
| ----- | :---- |
| **self\_set** | I developed them myself — they reflect my own values and goals |
| **family** | They came from my upbringing — often unstated but deeply felt expectations |
| **culture** | They came from my environment — career norms, peers, or social comparison |
| **survival** | They formed as a way to stay safe, be loved, or manage difficult circumstances |
| **unclear** | I'm not sure — they're just the water I swim in |

| IQ5  *Field: —* How easy is it for you to extend yourself the same compassion you'd offer a close friend who was struggling? |  |
| ----- | :---- |
| **1** | Very hard — I'm much harsher with myself than I would ever be with someone I care about |
| **2** | Difficult — I know I should but rarely actually do it |
| **3** | Sometimes — I manage it in some situations but not others |
| **4** | Often — I'm getting better at being kind to myself |
| **5** | Fairly natural — I can treat myself with the same care I'd give others |

| IQ6  *Field: —* How loud is the voice in your head that criticizes, judges, or tells you you're not enough? |  |
| ----- | :---- |
| **1** | Constant and loud — it's running most of the time |
| **2** | Frequent — it shows up a lot, especially in hard moments |
| **3** | Present but not dominant — I notice it but don't always believe it |
| **4** | Occasional — it shows up sometimes but doesn't run the show |
| **5** | Quiet — it's there but it rarely has real authority over how I see myself |

| IQ7  *Field: —* How comfortable are you existing without producing, achieving, or being useful? |  |
| ----- | :---- |
| **1** | Very uncomfortable — rest or stillness feels wrong or unsafe |
| **2** | Difficult — I can do it but there's guilt or anxiety underneath |
| **3** | Mixed — some rest feels okay, other times I can't settle |
| **4** | Fairly comfortable — I can be without doing without too much difficulty |
| **5** | Comfortable — I value rest and presence as much as output |

| IQ8  *Field: —* When your sense of who you are is challenged — by failure, change, or someone's criticism — how do you respond? |  |
| ----- | :---- |
| **1** | It destabilizes me significantly — I lose my footing and it takes a long time to recover |
| **2** | It hits hard — I'm affected for a while before I can reorient |
| **3** | It stings but I find my way back — it just takes effort |
| **4** | I feel it but I'm able to reconnect with myself fairly quickly |
| **5** | I stay relatively grounded — my sense of who I am doesn't depend on the outcome |

|  | WHAT THIS UNLOCKS Gidget stops coaching behavior and starts coaching the belief underneath. Reframes shift from tactical to identity-level. Self-worth source governs how goals are framed and how setbacks are addressed. Confidence Architecture path unlocked. |
| :---- | :---- |

## **Module 2 — Your Relational Blueprint**

| Property | Detail |
| :---- | :---- |
| Length | 10 minutes · 8 questions |
| Default Trigger | Day 14 |
| Accelerated Trigger | Day 7 if relational\_load\_signal \= high |
| Headline | How you connect — and how you protect yourself |
| Sub | These questions look at your patterns in relationships — not to judge them, but to understand how they're shaping what's possible for you. |
| Fields Written | attachment\_signal · conflict\_pattern · support\_seeking\_capacity · intimacy\_safety\_level · module\_relational\_complete \= yes · modules\_completed\_count \+ 1 |

| RQ1  *Field: attachment\_signal* When a relationship feels uncertain or strained, your first instinct is usually to: |  |
| ----- | :---- |
| **anxious** | Reach out, seek reassurance, or try to resolve it quickly — uncertainty is hard to sit with |
| **avoidant** | Create space and distance — I process better when I pull back |
| **secure** | Stay present and address it when timing feels right — I trust it can work through |
| **disorganized** | It varies unpredictably — sometimes I reach out, sometimes I shut down, often I don't know why |

| RQ2  *Field: conflict\_pattern* When real conflict arises with someone important to you, you tend to: |  |
| ----- | :---- |
| **avoid** | Minimize it, change the subject, or let it go without real resolution |
| **escalate** | Engage directly and sometimes more intensely than I intended |
| **collapse** | Agree or apologize quickly to restore peace even when I don't mean it |
| **engage** | Stay present with the discomfort and work toward actual resolution |

| RQ3  *Field: support\_seeking\_capacity* When you're genuinely struggling, asking for help feels: |  |
| ----- | :---- |
| **high** | Natural — I reach out and can receive support well |
| **medium** | Possible but uncomfortable — I do it but it takes real effort |
| **low** | Very difficult — I prefer to handle things alone or feel I shouldn't need help |
| **blocked** | Almost impossible — asking for help feels like failure or significant risk |

| RQ4  *Field: intimacy\_safety\_level* In your closest relationship right now — partner, best friend, or whoever is most significant — how emotionally safe do you feel? |  |
| ----- | :---- |
| **safe** | Very safe — I can be fully myself without editing |
| **mixed** | Mostly safe but with things I hold back or can't say |
| **unsafe** | Mostly unsafe — I feel like I need to manage how I appear |
| **absent** | This relationship doesn't exist right now — I don't have a primary close relationship |

| RQ5  *Field: —* How lonely do you feel — not in terms of being alone, but in terms of being truly known by someone? |  |
| ----- | :---- |
| **1** | Deeply lonely — I feel unseen even in the company of people who care about me |
| **2** | Often lonely — the knowing feels surface-level in most of my relationships |
| **3** | Sometimes — I have moments of real connection but they're not consistent |
| **4** | Rarely — I feel known by at least a few people in my life |
| **5** | Not lonely — I feel genuinely known and connected |

| RQ6  *Field: —* How well do you receive care, help, or support when it's offered to you? |  |
| ----- | :---- |
| **1** | I deflect it, minimize it, or feel uncomfortable — receiving is hard for me |
| **2** | I can receive it but there's discomfort or guilt underneath |
| **3** | Mixed — depends on who it's from and what kind of support it is |
| **4** | Fairly well — I can let people in without too much difficulty |
| **5** | Well — I can receive care gracefully and it genuinely nourishes me |

| RQ7  *Field: —* How much do your relationships currently cost you versus nourish you? |  |
| ----- | :---- |
| **1** | They cost much more than they give — I'm pouring out with very little coming back |
| **2** | Mostly costly — I give a lot and feel somewhat depleted by my relationships |
| **3** | About equal — some take, some give, it roughly balances |
| **4** | Mostly nourishing — my relationships generally refuel me |
| **5** | Very nourishing — the people in my life are a genuine source of strength |

| RQ8  *Field: —* How much do you believe you are worthy of deep, mutual, loving relationships? |  |
| ----- | :---- |
| **1** | I struggle to believe that — somewhere I feel like I'm too much, not enough, or fundamentally unlovable |
| **2** | I intellectually believe it but emotionally it's harder — part of me doubts it |
| **3** | Most of the time I believe it, but it shakes in certain moments |
| **4** | I generally believe it — I know I deserve real connection |
| **5** | Fully — I know I am worthy of and capable of deep mutual love and connection |

|  | WHAT THIS UNLOCKS Gidget adjusts directness based on attachment signal. Avoidant users get more space. Anxious users get more reassurance before challenge. Boundary work and communication coaching activated. System stops assuming a support network exists. |
| :---- | :---- |

## **Module 3 — Your History & Context**

| Property | Detail |
| :---- | :---- |
| Length | 8 minutes · 6 questions — MOST SENSITIVE MODULE |
| Default Trigger | Day 21 |
| Accelerated Trigger | Day 10 if stability \< 3.2 OR grief\_mode\_active \= yes |
| Headline | What shaped you is still shaping you |
| Sub | This is completely optional and entirely private. You don't have to name anything specific. These questions look at the larger context around your patterns — not to explain you away, but to understand you better. |
| Tone | Softest language of all modules. Never push. Present as 'available when you're ready'. |
| Fields Written | trauma\_activation\_level · grief\_load\_level · prior\_support\_type · significant\_events\_12mo · trauma\_informed\_mode (if trauma\_activation \= active) · module\_history\_complete \= yes · modules\_completed\_count \+ 1 |

| HQ1  *Field: trauma\_activation\_level* Some people carry experiences from the past that still show up in the present — in the body, in reactions, in patterns. Without needing to name anything specific, does that feel true for you? |  |
| ----- | :---- |
| **low** | Not really — my past feels processed or not particularly present in how I function now |
| **present** | Somewhat — there are things back there that still influence me in ways I notice |
| **active** | Yes — there are experiences that are still very much alive in how I respond and function |
| **unsure** | I'm not sure — I haven't thought about it in these terms before |

| HQ2  *Field: grief\_load\_level* If you think about loss across your life — people, relationships, identities, versions of yourself you've had to let go — how much unprocessed grief do you sense you're carrying? |  |
| ----- | :---- |
| **low** | Not much — what I've lost feels relatively integrated or distant |
| **moderate** | Some — there are losses I haven't fully sat with or that still surface |
| **high** | A significant amount — grief feels like a layer underneath many other things |
| **unsure** | I'm not sure — this isn't a lens I've used to look at my life before |

| HQ3  *Field: significant\_events\_12mo* In the past 12 months, have any of the following happened? Select all that apply. |  |
| ----- | :---- |
| **major\_loss** | Death of someone significant, or end of a major relationship |
| **health\_event** | Significant health diagnosis, illness, injury — yours or someone close |
| **job\_change** | Major career change, job loss, or financial disruption |
| **living\_change** | Significant move, housing change, or major logistical life disruption |
| **family\_change** | Birth of a child, major family crisis, or significant change in family structure |
| **none** | None of these — the past 12 months have been relatively stable |

| HQ4  *Field: prior\_support\_type* Have you ever worked with a therapist, coach, counselor, or other professional support? |  |
| ----- | :---- |
| **therapy** | Yes — therapy or counseling, and it was helpful |
| **therapy\_mixed** | Yes — therapy or counseling, with mixed or limited results |
| **coaching** | Yes — coaching or similar, and it was helpful |
| **coaching\_mixed** | Yes — coaching or similar, with limited results |
| **none** | No — I haven't worked with professional support before |
| **open** | Not formally, but I'm open to it |

| HQ5  *Field: —* When things have been really hard in the past, what has actually helped you get through? |  |
| ----- | :---- |
| **people** | Other people — connection, support, being known by someone |
| **action** | Taking action — doing something helped more than sitting with it |
| **time** | Time — I needed space for things to naturally settle |
| **meaning** | Meaning — finding a why or a frame that made sense of the difficulty |
| **nothing** | Honestly, I'm not sure anything has — I've mostly just endured |
| **mixed** | A combination — different things help in different situations |

| HQ6  *Field: —* What hasn't worked when you've tried to get support or make changes in the past? |  |
| ----- | :---- |
| **too\_generic** | Generic advice that didn't account for my actual situation |
| **not\_ready** | I wasn't ready — the support was fine, I just couldn't use it then |
| **felt\_judged** | I felt judged or misunderstood in the process |
| **surface\_only** | It stayed surface-level — never got to what was actually going on |
| **accountability** | I needed more accountability and structure than I got |
| **no\_barrier** | I don't have a specific barrier — I'm coming in relatively open |

|  | WHAT THIS UNLOCKS Trauma-informed mode activated if trauma\_activation \= active — Gidget slows, stops pushing through resistance, recognizes historical vs. current-choice patterns. Grief load modifies session pacing. Prior support data calibrates coaching approach to what has and hasn't worked. |
| :---- | :---- |

## **Module 4 — Financial Reality**

| Property | Detail |
| :---- | :---- |
| Length | 5 minutes · 5 questions |
| Default Trigger | Day 10 |
| Accelerated Trigger | Immediately after onboarding if financial\_load\_signal \= high |
| Headline | The load that affects everything and gets mentioned nowhere |
| Sub | This is practical and private. Five honest questions about money and what it's costing you beyond the financial. |
| Fields Written | financial\_stability\_signal · financial\_anxiety\_level · financial\_agency\_level · module\_financial\_complete \= yes · modules\_completed\_count \+ 1 |

| FQ1  *Field: financial\_stability\_signal* How would you honestly describe your financial situation right now? |  |
| ----- | :---- |
| **stable** | Stable — income covers needs with some margin and I'm not worried |
| **strained** | Strained — managing but with real pressure and not much room |
| **crisis** | In crisis — significant financial stress or instability that affects daily functioning |
| **rebuilding** | Rebuilding — coming back from a difficult period and beginning to gain traction |

| FQ2  *Field: financial\_anxiety\_level* How much mental bandwidth is financial stress consuming day to day? |  |
| ----- | :---- |
| **low** | Minimal — money is not a significant source of mental noise for me right now |
| **medium** | Moderate — it's there in the background most days and takes real bandwidth |
| **high** | Significant — financial worry is a daily presence that affects my decisions and mood |

| FQ3  *Field: financial\_agency\_level* How much control do you feel you have over your financial situation? |  |
| ----- | :---- |
| **in\_control** | Real control — I'm making intentional choices and can see a path forward |
| **somewhat** | Some — I'm making choices but external forces limit what I can actually do |
| **little** | Very little — I feel like I'm reacting more than choosing |
| **none** | None — my financial situation feels like it's happening to me completely |

| FQ4  *Field: —* What is the primary source of financial stress for you right now? Select the most accurate. |  |
| ----- | :---- |
| **debt** | Debt — the weight of what I owe is significant |
| **income** | Income instability — inconsistent or insufficient income |
| **unexpected** | Unexpected expense or crisis — something disrupted what was working |
| **savings** | Lack of savings — no buffer and it creates anxiety about the future |
| **comparison** | Financial comparison — I feel behind where I think I should be |
| **not\_financial** | It's not really financial — this module may not apply much to me right now |

| FQ5  *Field: —* How does financial stress most affect you day to day? |  |
| ----- | :---- |
| **decisions** | It affects my decisions — I can't think clearly about money |
| **relationships** | It creates strain in my relationships — money tension is relational tension |
| **sleep** | It shows up in my body — sleep, tension, physical symptoms |
| **shame** | It creates shame or a sense of failure I carry |
| **avoidance** | I avoid looking at it — the avoidance costs more than the actual situation |
| **minimal** | It doesn't significantly affect my daily functioning right now |

|  | WHAT THIS UNLOCKS Gidget removes resource-intensive recommendations when financial load is high. Adds financial stress acknowledgment to session language. Financial Stress Navigation path surfaced. Practical prioritization coaching emphasized over aspirational goal work. |
| :---- | :---- |

## **Module 5 — Your Body's Story**

| Property | Detail |
| :---- | :---- |
| Length | 8 minutes · 7 questions |
| Default Trigger | Day 5 |
| Accelerated Trigger | Day 3 if nervous\_system\_state \= depleted or shut\_down |
| Headline | What your body is carrying and trying to tell you |
| Sub | This isn't about fitness goals or weight. It's about the physical signals your system has been sending — and whether you've been able to hear them. |
| Fields Written | sleep\_quality\_signal · hormonal\_context\_flag · hormonal\_context\_type · chronic\_pain\_flag · body\_relationship · substance\_pattern\_signal · module\_body\_complete \= yes · modules\_completed\_count \+ 1 |

| BQ1  *Field: sleep\_quality\_signal* How would you rate your sleep quality over the past few weeks — not just hours, but how rested you actually feel? |  |
| ----- | :---- |
| **good** | Good — I'm sleeping well and waking rested most days |
| **fair** | Fair — inconsistent nights, sometimes okay, sometimes not |
| **poor** | Poor — my sleep is disrupted, insufficient, or consistently unrestorative |

| BQ2  *Field: chronic\_pain\_flag* Do you live with chronic pain, physical symptoms, or a physical health condition that affects your daily functioning? |  |
| ----- | :---- |
| **yes\_significant** | Yes — significantly. It shapes how I move through most days. |
| **yes\_manageable** | Yes — but it's manageable. It's present but not dominant. |
| **sometimes** | Sometimes — flare-ups or intermittent symptoms that vary |
| **no** | No — physical health is not a significant daily challenge right now |

| BQ3  *Field: hormonal\_context\_flag* Are you currently navigating a significant hormonal or physiological transition that affects your energy, mood, or body? |  |
| ----- | :---- |
| **yes\_perimenopause** | Yes — perimenopause or menopause and it's affecting how I function |
| **yes\_postpartum** | Yes — postpartum within the past 18 months |
| **yes\_other** | Yes — another significant hormonal or health transition I'm navigating |
| **no** | No — I'm not in a significant transition like this right now |

| BQ4  *Field: body\_relationship* How would you describe your relationship with your physical body right now? |  |
| ----- | :---- |
| **connected** | Connected — I listen to my body and it generally feels like an ally |
| **neutral** | Neutral — my body is just there. I don't think about it much. |
| **disconnected** | Disconnected — I feel cut off from physical signals or awareness |
| **conflicted** | Conflicted — there's tension, judgment, or frustration in how I relate to my body |

| BQ5  *Field: substance\_pattern\_signal* Beyond what you may have shared earlier about recovery, how would you describe your current relationship with alcohol, substances, or medication use? |  |
| ----- | :---- |
| **none** | Not relevant — I don't use alcohol, substances, or have concerns here |
| **managed** | Present and managed — I use alcohol or similar and feel in control of it |
| **watching** | I'm watching it — use has crept up and I've noticed it |
| **concerning** | Concerning — I'm aware my relationship with this isn't serving me well |

| BQ6  *Field: —* How consistently are you moving your body in some form — walking, exercise, physical activity? |  |
| ----- | :---- |
| **1** | Barely at all — almost no physical movement in my daily life |
| **2** | Very little — occasional but inconsistent |
| **3** | Some — a few times a week on better weeks |
| **4** | Regular — I move my body consistently most weeks |
| **5** | Strong — physical movement is a regular, meaningful part of how I function |

| BQ7  *Field: —* How much tension do you carry in your body on a typical day? |  |
| ----- | :---- |
| **1** | Significant and constant — my body rarely feels loose or at ease |
| **2** | Often tense — I notice physical holding through most of my day |
| **3** | Some — certain times or situations bring it up |
| **4** | Mild — I have tension but it's not the dominant physical experience |
| **5** | Mostly relaxed — my body feels at ease most of the time |

|  | WHAT THIS UNLOCKS Somatic check-ins added to sessions. Energy expectations calibrated to actual physical baseline. Hormonal context informs how Gidget interprets energy crashes and mood. Body-based grounding practices added. Sleep & Recovery path surfaced if indicated. Body Reconnection path surfaced if body\_relationship \= disconnected. |
| :---- | :---- |

## **Module 6 — What Holds You**

| Property | Detail |
| :---- | :---- |
| Length | 8 minutes · 7 questions |
| Default Trigger | Day 30 |
| Accelerated Trigger | Day 14 if alignment \< 3.2 |
| Headline | What gives you meaning and what you reach for when things get hard |
| Sub | These are the questions most apps never ask. They're not religious or prescriptive — they're about what anchors you, what you're living toward, and what you draw on when the usual things don't work. |
| Tone | Open. Non-prescriptive. No assumptions about faith, belief, or spiritual framework. |
| Fields Written | purpose\_clarity · spiritual\_framework\_present · spiritual\_framework\_type · belonging\_level · pressure\_reach · module\_meaning\_complete \= yes · modules\_completed\_count \+ 1 |

| MQ1  *Field: purpose\_clarity* How would you describe your current relationship with a sense of purpose? |  |
| ----- | :---- |
| **clear** | Clear — I know what I'm here for and it guides how I live most days |
| **searching** | Searching — I sense there's something but I'm still finding it |
| **lost** | Lost — I've lost the thread of what my life is for right now |
| **rebuilding** | Rebuilding — I had clarity before and I'm working to reconnect with it |

| MQ2  *Field: spiritual\_framework\_type* Do you have a spiritual, faith, or meaning-making framework that you draw on? |  |
| ----- | :---- |
| **active** | Yes — it's active and real in my daily life |
| **background** | Yes — it's present but more in the background than the foreground |
| **complicated** | Complicated — I grew up with one but my relationship to it has changed significantly |
| **no** | No — I don't have a spiritual or faith framework |
| **exploring** | I'm exploring — this is something I'm actively working through right now |

| MQ3  *Field: belonging\_level* How much do you feel genuinely part of something larger than yourself — a community, a cause, a group of people with shared purpose? |  |
| ----- | :---- |
| **strong** | Strongly — I have real belonging and it matters to how I function |
| **moderate** | Somewhat — I have some connection but it doesn't feel deep or consistent |
| **weak** | Barely — I feel mostly unconnected from anything larger than my immediate life |
| **absent** | Not at all — I feel genuinely isolated from any sense of community or shared purpose |

| MQ4  *Field: pressure\_reach* When things get really hard — beyond your normal stress — what do you actually reach for? |  |
| ----- | :---- |
| **faith** | Faith or spiritual practice — prayer, meditation, or spiritual community |
| **people** | People — I reach for connection, someone who knows me |
| **work** | Work or productivity — doing something feels better than sitting with it |
| **substances** | Substances or numbing — alcohol, food, screens, anything to take the edge off |
| **avoidance** | Avoidance — I pull back and hope it passes |
| **solitude** | Solitude — I go inward and process alone |

| MQ5  *Field: —* How open or closed does the future feel to you right now? |  |
| ----- | :---- |
| **1** | Completely closed — I can't see a positive future from where I stand |
| **2** | Mostly closed — hope is present but thin |
| **3** | Uncertain — the future is unclear but not foreclosed |
| **4** | Mostly open — I can see real possibility even with current uncertainty |
| **5** | Open — the future feels full of possibility and I'm oriented toward it |

| MQ6  *Field: —* How meaningful does your daily life feel right now — not just busy or productive, but genuinely meaningful? |  |
| ----- | :---- |
| **1** | Not meaningful — I feel like I'm just going through the motions with no real sense of why |
| **2** | Rarely — glimpses of meaning but it's not the dominant texture of my days |
| **3** | Sometimes — some things feel meaningful, others are just motion |
| **4** | Often — most days have a thread of meaning I can feel |
| **5** | Deeply — my life feels genuinely meaningful and I know why I'm doing what I'm doing |

| MQ7  *Field: —* How would you describe your relationship with your own mortality — the fact that your time is finite? |  |
| ----- | :---- |
| **active\_motivator** | It motivates me — knowing time is finite makes me more intentional about how I live |
| **background** | It's in the background but doesn't significantly shape my choices |
| **avoided** | I don't think about it — I avoid the topic |
| **anxiety\_producing** | It produces anxiety or fear when I consider it |
| **complicated** | It's complicated — I'm in a season where mortality feels more present than I'd like |

|  | WHAT THIS UNLOCKS Purpose language incorporated into session framing. Goals connected to meaning. Faith-aware coaching activated where relevant. Community building surfaced as a coaching goal when belonging is weak or absent. Purpose Discovery and Life Direction Reset paths surfaced. |
| :---- | :---- |

| SECTION 10 — MODULE TRIGGER SYSTEM |
| :---: |

## **Default Time-Based Schedule**

| Module | Default Day | Accelerated Trigger | Presentation Copy |
| :---- | :---- | :---- | :---- |
| Body's Story | Day 5 | Day 3 if energy \= depleted or shut\_down | Your next step: what your body is carrying and trying to tell you |
| Financial Reality | Day 10 | Immediately if financial\_load \= high | A quick check-in on the layer that affects everything else |
| Identity Lens | Day 7 | Day 5 if performance \< 3.2 AND overthink/avoid pattern | Go deeper: who you believe you are shapes everything else |
| Relational Blueprint | Day 14 | Day 7 if relational\_load \= high | Understand how you connect — and how you protect yourself |
| History & Context | Day 21 | Day 10 if stability \< 3.2 OR grief active | Optional and private: what shaped you is still shaping you |
| What Holds You | Day 30 | Day 14 if alignment \< 3.2 | The deepest layer: what gives you meaning and what you reach for |

## **Re-Assessment Triggers**

* 90-day cycle completes — all modules offered for refresh

* User submits significant life event flag (in-app option) — relevant modules re-triggered

* Any score drops \>= 0.8 between check-ins — relevant module re-triggered immediately

* User requests re-assessment from profile — full PuP 360 re-run available

## **User-Initiated Access**

All modules always available via user profile under 'Know Yourself Deeper'. User can complete in any order at any time. Self-initiated completion is weighted more heavily in coaching adaptation — indicates readiness and self-awareness.

| SECTION 11 — AI COACHING ENGINE |
| :---: |

The AI coaching engine never coaches from scores alone. It coaches from pattern \+ pressure \+ state \+ behavioral fingerprint. And it knows what it doesn't know.

## **AI Prompt Architecture — What Gets Sent to the Model**

Every coaching session must compile and send the following User data as a structured system prompt. This is the full context Gidget receives before the user says anything.

|  | SYSTEM PROMPT TEMPLATE The following fields must be compiled into the Gidget system prompt at session start: first\_name · classification\_type · pressure\_profile · behavioral\_fingerprint · tradeoff\_statement · ai\_coaching\_mode · ai\_confidence\_level · stability\_score · performance\_score · alignment\_score · primary\_pillar · role\_type · nervous\_system\_state · energy\_level\_signal · cognitive\_load\_signal · relational\_load\_signal · financial\_load\_signal · recovery\_mode\_active · grief\_mode\_active · trauma\_informed\_mode · all completed module fields · trajectory\_type (if set) · session\_count · streak\_days · micro\_commitment\_active (if set) |
| :---- | :---- |

## **Coaching Decision Logic — Run in Order Each Session**

### **Step 1 — Identify Primary Coaching Priority**

| Classification | Priority | Opening Frame |
| :---- | :---- | :---- |
| Capacity Erosion | STABILIZE | 'Before anything else — how are you actually doing right now?' |
| Performance Stagnation | ACTIVATE | 'Let's get specific about where things are getting stuck.' |
| Alignment Fracture | REALIGN | 'Let's find the thread — what actually matters to you right now?' |
| High Output / Hidden Instability | SUSTAIN | 'Your output is real. Let's look at what it's costing underneath.' |
| Optimization Ready | EXPAND | 'You're in a strong position. Where do you want to go next?' |
| Comfortable Plateau | SURFACE | 'Something brought you here. Let's sit with that for a moment.' |
| Building Momentum | ACCELERATE | 'You're ready to move. Let's find your highest leverage right now.' |

### **Step 2 — Apply Load Modifier**

| Load | Adjustment |
| :---- | :---- |
| cognitive\_load \= high | Simplify everything. Fewer options. Shorter responses. One question at a time. Less content per session. |
| relational\_load \= high | Add boundary and communication work. Don't assume relationships are resources. Name relational cost explicitly. |
| environmental\_load \= high | Focus on structure, systems, and prioritization. Practical first. Reduce decision overhead. |
| financial\_load \= high | Remove resource-heavy or time-intensive recommendations. Acknowledge financial stress directly. Practical always before aspirational. |

### **Step 3 — Apply State Modifier**

| State | Adjustment |
| :---- | :---- |
| wired | Open with regulation. Calm language. No urgency. Reduce intensity before introducing challenge. |
| regulated | Full range available. Challenge, stretch, and direct confrontation all appropriate. |
| depleted | Gentle only. Low-demand. Micro-wins. Validate first — always. No big asks or stretch goals. |
| shut\_down | Re-engagement as the goal. Tiny steps. High acknowledgment. Never push through. Activate before anything else. |

### **Step 4 — Apply Behavioral Fingerprint Modifier**

| Pattern | Adjustment |
| :---- | :---- |
| Avoidant / \* | Name the avoidance gently. Make action feel safe. Reduce perceived cost of starting. Ask 'what's the smallest possible step?' |
| Analytical / \* | Limit insight loops. Move toward commitment faster. 'What would you do if you already knew enough?' |
| Driver / \* | Surface the cost of pushing. Introduce recovery as performance strategy. 'What does sustaining this actually require?' |
| Collaborative / \* | Use peer structures deliberately. Watch for external validation dependency. Build internal anchor. |
| Situationally Adaptive | Focus on pattern recognition over time. 'What do you notice about when this works and when it doesn't?' |

### **Step 5 — Apply Module Data Modifiers**

| Module Complete | Coaching Change |
| :---- | :---- |
| Identity Lens | Shift from behavioral to belief-level coaching. Address identity directly. 'What does this bring up about how you see yourself?' |
| Relational Blueprint | Adjust directness based on attachment\_signal. Add relational lens to all coaching. Stop assuming support exists if sq5 \< 3\. |
| History & Context | If trauma\_activation \= active: slow down, stop pushing through resistance, recognize historical patterns as such. If grief\_load \= high: give more time before expecting action. |
| Financial Reality | Remove resource-heavy suggestions. Acknowledge financial stress. Prioritization coaching emphasized. |
| Body's Story | Add somatic check-in to each session. Calibrate energy expectations to body signals. Hormonal context modifies energy and mood interpretation. |
| What Holds You | Connect goals to purpose. Use meaning language. Add community as a coaching variable when belonging is low. |

## **What Gidget Knows It Doesn't Know**

Before each module completes, Gidget actively probes for the missing data in session. It does not wait for modules to fill the picture — it builds the picture actively.

| Module Incomplete | Gidget Probes In Session |
| :---- | :---- |
| Relational Blueprint | 'Tell me about who you have around you right now — who actually shows up for you?' |
| Financial Reality | 'How much of your stress is practical versus emotional right now — is there a money layer to any of this?' |
| History & Context | 'Has this pattern shown up for you before, or does it feel like something new?' |
| Identity Lens | 'When things go wrong, what's the story you tell yourself about why?' |
| Body's Story | 'How is your body holding all of this — what physical signals are you getting?' |
| What Holds You | 'What do you reach for when the usual things aren't working? What actually helps?' |

## **Coaching Mode Behavior**

| Mode | Tone & Language Rules |
| :---- | :---- |
| Stabilizer | Slow pace. Short responses. Validate before anything. No urgency language. No performance references. 'That makes complete sense.' 'Let's stay here for a moment.' |
| Simplifier | One idea at a time. No lists over 3 items. Short sentences. Reduce cognitive load in the response itself. 'Let's make this simple.' |
| Strategist | Direct. Challenge assumptions. Use data from scores. Ask for commitment. 'What are you actually willing to do differently?' Future-focused. |
| Rebuilder | More questions than answers. Deeper excavation. 'What does that mean to you?' Stay with identity and meaning. Slower pace than Strategist. |
| Protector | Highest empathy. Slowest pace. Never push. 'Take your time.' 'You don't have to have an answer.' Safety and containment first. |

## **Trajectory Tracking — Post Reassessment**

| Type | Signal | Gidget Response |
| :---- | :---- | :---- |
| Stabilizing | Scores improving 2+ dimensions by \>= 0.3 | Acknowledge progress explicitly. Increase stretch. Signal next classification horizon. |
| Volatile | Score swings \> 1.0 in any dimension | Focus on regulation and consistency. Investigate instability triggers. |
| Stuck | Score delta \< 0.3 all dimensions after 90 days | Pattern disruption. Name directly. Surface avoidance or wrong goal. |
| Accelerating | All scores up \> 0.8 in 90 days | Celebrate. Recalibrate upward. Watch for overextension. |

## **Crisis Intervention Logic**

|  | CRISIS PROTOCOL — MUST BUILD The following triggers must show crisis resources immediately and interrupt normal coaching flow. These are non-negotiable safety requirements. |
| :---- | :---- |

| Trigger | Response |
| :---- | :---- |
| User types any of: 'want to die', 'kill myself', 'end my life', 'suicidal', 'can't go on' | Interrupt coaching response. Show: 'It sounds like you're carrying something really heavy right now. Please reach out for support immediately: Call or text 988 (Suicide & Crisis Lifeline) — available 24/7. Text HOME to 741741 (Crisis Text Line). Gidget is coaching only and can't provide crisis care. Please reach out now.' Do not continue coaching session. |
| stability\_score \< 1.5 at any assessment | Flag for manual review if enterprise account. Show crisis resources prominently on dashboard. Gidget opens every session with safety check-in. |
| recovery\_mode\_active AND user mentions relapse | Show: 'Recovery is nonlinear and a setback doesn't erase the progress you've made. You don't have to handle this alone. SAMHSA National Helpline: 1-800-662-4357 — free, confidential, 24/7.' Continue with Protector mode only. |

| SECTION 12 — SUBSCRIPTION TIERS & CONTENT GATING |
| :---: |

## **Tier Structure**

| Tier | Name | Access | Target User |
| :---- | :---- | :---- | :---- |
| Free | Explorer | Core onboarding · 3 Free paths · Basic dashboard · 3 Gidget sessions/month · First module unlock | New users — prove value before commitment |
| Pro | Member | All Free \+ All Pro paths · Unlimited Gidget sessions · All 6 modules · Daily check-in · Trajectory tracking · Full dashboard | Core paying user — full experience |
| Premium | Intensive | All Pro \+ Premium paths · Priority Gidget response · Direct coaching support access · Custom path creation · Reassessment on demand | High-commitment user — maximum depth |
| Enterprise | Team | All Premium \+ org dashboard · Team heatmaps · HR reporting · Aggregated insights · Admin controls | Organizations — Phase 3 |

## **Feature Gating by Tier**

| Feature | Free | Pro | Premium | Enterprise |
| :---- | :---- | :---- | :---- | :---- |
| Onboarding PuP 360 | Yes | Yes | Yes | Yes |
| Core classification \+ results | Yes | Yes | Yes | Yes |
| Dashboard — basic | Yes | Yes | Yes | Yes |
| Free tier paths (3 paths) | Yes | Yes | Yes | Yes |
| Gidget sessions | 3/month | Unlimited | Unlimited | Unlimited |
| Deep-dive modules | First 1 free | All 6 | All 6 | All 6 |
| Pro tier paths | No | Yes | Yes | Yes |
| Premium paths | No | No | Yes | Yes |
| Daily check-in | No | Yes | Yes | Yes |
| Trajectory tracking | No | Yes | Yes | Yes |
| 90-day reassessment | No | Yes | Yes | Yes |
| Org dashboard | No | No | No | Yes |
| Team heatmaps | No | No | No | Yes |

## **Upsell Trigger Logic**

| Trigger | Upsell Message | Timing |
| :---- | :---- | :---- |
| User hits Gidget session limit (Free) | You've used your 3 sessions for this month. Pro members get unlimited sessions — your coach is ready when you are. | At limit |
| User tries to access Pro path (Free) | This path is part of Pro membership. Upgrade to unlock all 14 Pro paths and unlimited coaching. | On click |
| User completes first module (Free) | You've unlocked your first deep-dive. There are 5 more waiting — Pro members access all 6\. | After module complete |
| classification \= Optimization Ready (Free) | You're operating at a high level. The tools that match where you are live in Pro and Premium. This is where it gets interesting. | On dashboard load |
| User reaches 30 days (Free) | You've been building something real. Pro gives you the full picture — trajectory tracking, all modules, and unlimited coaching. | Day 30 |

| SECTION 13 — NOTIFICATION & RE-ENGAGEMENT SYSTEM |
| :---: |

## **Notification Types**

| Type | Trigger | Message Style | Frequency |
| :---- | :---- | :---- | :---- |
| Module Unlock | Trigger day reached | 'Your next layer is ready: \[Module Name\] — 10 minutes when you're ready.' | Once — resend after 3 days if not opened |
| Daily Check-in | Daily at user's preferred time (set during onboarding) | 'How are you doing today, \[Name\]? Your daily check-in is ready.' | Daily — user can disable |
| Gidget Session Nudge | No session in 5 days | 'Your coach hasn't heard from you. No pressure — \[Name\] is here when you're ready.' | Max once per 5 days |
| Path Progress | Path started but no activity in 7 days | 'You started \[Path Name\] — there's a session waiting for you.' | Once per path per week |
| Reassessment Due | 90 days from assessment\_date | 'It's been 90 days. Your PuP 360 reassessment is ready — see how things have shifted.' | Once — resend at 95 days |
| Milestone | First module complete / 30 day streak / classification shift | Personalized acknowledgment based on milestone type | Event-triggered |
| Streak Encouragement | streak\_days \= 7, 14, 30 | '\[X\] days in a row. Something's building.' | Milestone-triggered |

## **Re-engagement Rules**

* Never send more than 1 notification per day regardless of triggers

* If user has been inactive for 14 days: send a single re-engagement message with zero urgency framing

* If user has been inactive for 30 days: offer a fresh start prompt — 'A lot can change in a month. Want to check in?'

* If user has been inactive for 60 days: offer re-assessment rather than returning to existing session

* Never use guilt, urgency, or loss-framing in notifications — Uncloud360 earns return, does not demand it

| SECTION 14 — COACHING SESSION STRUCTURE |
| :---: |

## **Standard Session Flow**

| Phase | Name | Content | Gidget Behavior |
| :---- | :---- | :---- | :---- |
| 1 | Check-in (open) | 'How are you doing right now — what's most present for you today?' | Listen before directing. Note emotional state vs. last session. |
| 2 | Focus identification | 'What do you most want to work on today?' | Offer 2–3 options based on classification \+ active paths if user is unsure. Don't impose. |
| 3 | Exploration | Deeper questioning based on focus selected | Coaching mode determines approach — stabilizer vs. strategist etc. |
| 4 | Insight or reframe | Reflect back a pattern, belief, or tradeoff the user surfaced | Draw on classification, fingerprint, and module data. Connect to bigger picture. |
| 5 | Commitment or next step | 'What's one thing you're willing to do before we talk again?' | Micro-commitment stored as micro\_commitment\_active. Due date set. |
| 6 | Close | 'How are you leaving this conversation?' Brief close. | Match user's energy. No urgency about next session. |

## **Session Memory — Phase 2**

In Phase 2, Gidget maintains session memory across conversations. The following are tracked per session and fed into the next session's system prompt:

* Topics covered in last session

* Micro-commitment set and whether it was completed

* Emotional state at start vs. end of session

* Patterns Gidget named and user's response to them

* Resistance points — where user pulled back or deflected

| SECTION 15 — 90-DAY REASSESSMENT WORKFLOW |
| :---: |

## **Reassessment Trigger**

At 90 days from assessment\_date, the system sends the reassessment notification. User clicks through to a streamlined re-run of the PuP 360 core screens (Screens 5–11 only — Stability, Performance, Alignment, Load, State, Behavioral Pattern). Screens 1–4 and Screen 12 are skipped unless user requests full reset.

## **Score Comparison Logic**

| Calculation | Field | Notes |
| :---- | :---- | :---- |
| New score − original score | \[dimension\]\_score\_delta | Store on User. Positive \= improvement. |
| Abs(new − old) \> 0.8 in any dimension | significant\_shift\_flag \= yes | Triggers module re-trigger logic |
| All deltas \< 0.3 | trajectory\_type \= stuck | Triggers pattern disruption coaching |
| 2+ dimensions improved \>= 0.3 | trajectory\_type \= stabilizing |  |
| Any dimension swings \> 1.0 from prior | trajectory\_type \= volatile |  |
| All dimensions improved \>= 0.8 | trajectory\_type \= accelerating |  |

## **Post-Reassessment Actions**

* Recalculate classification\_type — user may have shifted

* If classification changed: update dashboard, re-assign paths, notify user with results framing

* Recalculate pressure\_profile and behavioral\_fingerprint if Load or State signals changed

* Update ai\_confidence\_level based on current modules\_completed\_count

* Set trajectory\_type based on score comparison

* Schedule next reassessment at current\_date \+ 90 days

* Show reassessment results screen — same format as onboarding results with delta visualization

| SECTION 16 — PHASE 2 BUILD PLAN |
| :---: |

Phase 2 activates after Phase 1 is stable and retaining users at 30-day mark. These are advanced intelligence features that deepen coaching quality and engagement.

## **Phase 2 Feature 1 — Perception vs Reality Detection**

Cross-reference self-reported confidence or identity data against objective score data to identify distortion patterns. These become Insight Flags stored in the insight\_flags field.

| Insight Flag | Detection Logic | Coaching Response |
| :---- | :---- | :---- |
| Under-Recognition | performance\_score \>= 4.0 AND pq5 \<= 2 AND identity\_self\_worth\_source \= approval\_based | 'Your output data says something different than how you see yourself. Let's look at that gap.' |
| Overextension | performance\_score \>= 4.0 AND stability\_score \< 3.0 AND pressure\_response\_pattern \= push\_through | 'You're sustaining output beyond your current capacity. The math doesn't add up long-term.' |
| Identity Misalignment | primary\_pillar \= professional AND alignment\_score \< 3.0 AND identity\_role\_fusion\_score \>= 4 | 'How you're spending your life doesn't match what you say matters. That gap is where the friction lives.' |
| Impostor Pattern | pq5 \<= 2 AND performance\_score \>= 3.8 AND identity\_narrative\_type \= fixed | 'Objectively high performance with persistent self-doubt. This is a specific and very workable pattern.' |
| Chronic Over-functioning | caregiver/pro role AND pq1 \>= 4 AND sq4 \<= 2 AND support\_seeking\_capacity \= blocked | 'You're very clear on what you do for others and very unclear on what you need. That's not sustainable.' |

## **Phase 2 Feature 2 — Behavior Loop**

The behavior loop turns coaching insight into trackable behavior change. It has three components.

### **Component 1 — Daily Check-in**

3-question daily pulse. Runs at user's preferred time. Takes under 60 seconds. Feeds trajectory data.

| Question | Options | Field |
| :---- | :---- | :---- |
| How are you doing today? | 1 (rough) through 5 (strong) — emoji scale | daily\_pulse\_score |
| Did you follow through on your commitment? | Yes / Partially / No / I forgot — no judgment | micro\_commitment\_status |
| One word for how you're feeling? | Free text — 1–3 words | daily\_feeling\_text |

### **Component 2 — Micro-Commitment System**

At the end of every coaching session, Gidget asks: 'What's one thing you're willing to do before we talk again?' The response is stored as micro\_commitment\_active with a due date. Next session opens with status check.

*Note: Commitments must be specific, time-bound, and chosen by the user — not assigned by Gidget. If user can't name one, that's coaching data in itself.*

### **Component 3 — Reinforcement Logic**

| Event | Response |
| :---- | :---- |
| Micro-commitment completed | Acknowledge briefly. Ask: 'What made that possible this time?' Update streak\_days. |
| Micro-commitment not completed | Don't shame. Ask: 'What got in the way?' Use answer to update behavioral\_fingerprint if new pattern emerges. |
| 3 incomplete in a row | Surface to Gidget: 'I'm noticing we keep setting intentions that aren't landing. Let's look at what's actually in the way.' |
| 7-day streak | Acknowledge. Brief celebration. No over-praise — normalize consistency as the goal not the exception. |

## **Phase 2 Feature 3 — Session Memory**

Gidget maintains a structured memory of each session that is fed into subsequent sessions. The following is stored after each session ends and prepended to the next session's system prompt:

* Session date and primary topic covered

* Micro-commitment set — text and due date

* Key pattern or insight named during session

* User's emotional state at session start and close

* Any resistance or deflection points noted

* Gidget's coaching mode used and effectiveness signal (engagement level)

*Note: Session memory is summarized to avoid prompt token bloat — keep to 200 words max per session. Store last 5 sessions in active context.*

## **Phase 2 Feature 4 — Advanced Trajectory Analysis**

Beyond the basic trajectory types, Phase 2 adds pattern-level analysis:

| Pattern | Detection | Coaching Response |
| :---- | :---- | :---- |
| Cycle — improving then crashing | stability\_score improves then drops repeatedly across reassessments | 'There's a cycle here. Let's look at what you do right before the drop.' |
| Performance-stability seesaw | When performance rises, stability falls and vice versa | 'These two things seem to trade off for you. Let's understand why.' |
| Plateau after early gains | Strong first-90-day improvement followed by flatline | 'You made real progress early. Something shifted. What changed?' |
| Consistent incremental progress | Small steady improvement across all reassessments | 'You're not dramatic but you're consistent. That's actually the best pattern.' |

| SECTION 17 — PHASE 3 ENTERPRISE PLAN |
| :---: |

|  | DO NOT BUILD IN PHASE 1 OR 2 This section documents Phase 3 only. Consumer product must be stable and retaining users before B2B layer is built. Make the database decisions noted in Section 2 now — everything else waits. |
| :---- | :---- |

## **B2B Product Value Proposition**

Uncloud360 Enterprise gives HR leaders, CFOs, and leadership teams a real-time view of organizational health — not engagement surveys, not pulse checks, but a genuine diagnostic of how their people are functioning under pressure. The data exists because users want it for themselves. The org insight layer aggregates anonymized signals into decision-useful intelligence.

## **Required Data Architecture (Decide Now — Build Later)**

* Add organization\_id field to User data type — optional, null for consumer users

* Create Organization data type with: org\_name · admin\_email · plan\_tier · team\_count · industry

* Create OrgInsight data type — stores aggregated signals. Never individual user data.

* All aggregation runs server-side on anonymized data. Individual user records are never exposed to org admins.

* Minimum group size for any aggregated insight: 5 users. Never report groups smaller than 5\.

## **OrgInsight Data Points — Aggregate Only**

| Insight | Calculation | Org Use |
| :---- | :---- | :---- |
| Avg stability by department | Mean stability\_score across department group | Identify teams under emotional load |
| Avg performance by role | Mean performance\_score by role\_type | Identify execution gaps by function |
| Classification distribution | % of org in each classification\_type | Overall organizational health picture |
| Burnout risk signal | % with High Output/Hidden Instability \+ Capacity Erosion combined | Early burnout warning — flag if \> 30% |
| Cognitive load prevalence | % with cognitive\_load \= high | Indicates systemic overload — structural problem |
| Recovery/grief flag rate | % with recovery or grief flags | Indicates level of personal disruption in workforce |
| Trajectory distribution | % stabilizing vs. stuck vs. volatile | Org-level direction of travel |

## **Enterprise Dashboard — Key Screens**

### **Screen 1 — Org Overview**

* Overall health score — composite of avg S/P/A across org

* Classification heatmap — distribution across 7 types

* Burnout risk indicator — % in high-risk classifications

* 30/60/90 day trend — is the org improving or deteriorating

### **Screen 2 — Load Analysis**

* % of org reporting high cognitive load by department

* % reporting high relational load

* % reporting high financial load — population-level financial stress signal

* Recommendation: 'High cognitive load in engineering team suggests system or process overload, not individual performance issues'

### **Screen 3 — Trajectory Report**

* % accelerating / stabilizing / stuck / volatile across org

* 90-day movement — is the org shifting classification over time

* 'Your team has 34% stuck trajectory — coaching investment is not converting to behavior change. Recommend structural intervention.'

## **B2B Sales Use Cases**

| Buyer | Pain Point | Uncloud360 Answer |
| :---- | :---- | :---- |
| HR Director | Engagement surveys don't predict attrition or burnout | Real-time classification and trajectory data flags risk 90 days before it becomes a resignation |
| CFO | Can't quantify ROI of wellbeing investment | Before/after classification shifts across workforce. Cost of burnout vs. cost of platform. |
| PE Firm | Portfolio company health post-acquisition | Organizational diagnostic within 30 days. Risk flags before 100-day plan. |
| L\&D Leader | Training doesn't stick | Users are already being coached. L\&D can see what's blocking behavior change at the load and state level. |

| SECTION 18 — RECOMMENDED BUILD ORDER |
| :---: |

Build in this exact sequence. Each phase must be fully tested and stable before the next begins. Do not build out of sequence.

## **Phase 1 — Consumer Platform**

| Step | Build | Gate Before Next |
| :---- | :---- | :---- |
| 1A | Database — all User fields from Section 2 | Every field exists, accepts correct data type, no field missing |
| 1B | GuidedPath data type and all path records from Section 8 | All paths exist with correct fields. Classification and pillar matching works. |
| 1C | Onboarding — Screens 1–12 in order | Each screen saves correct fields. Test every role variant of Screen 6\. Full test user run. |
| 1D | Classification Logic — Parts A through F in order | All 7 classification types reachable. All derived fields populate correctly. Test every edge case. |
| 1E | Results Screen — Section 5 | All elements dynamic. Tradeoff statement correct. Scores color-coded correctly. |
| 1F | Completion Workflow — Section 6 | onboarding\_complete \= yes. Paths enrolled correctly. Modules scheduled. |
| 1G | Dashboard — Section 7 | All classification modifications working. Flag modifications working. Dynamic content verified. |
| 1H | Module delivery system — all 6 modules | Each module saves correct fields. modules\_completed\_count increments. ai\_confidence\_level updates. |
| 1I | Trigger system — Section 10 | Time-based triggers fire correctly. Score-based accelerations work. User-initiated access available. |
| 1J | AI Engine — Section 11 | System prompt compiles correctly. Coaching mode applied. Crisis logic tested and functional. |
| 1K | Subscription gating — Section 12 | Free/Pro/Premium features gated correctly. Upsell triggers fire. |
| 1L | Notification system — Section 13 | All notification types sending. Re-engagement rules respected. No more than 1/day. |
| 1M | 90-day reassessment — Section 15 | Reassessment triggers correctly. Score comparison runs. trajectory\_type assigned. |

## **Phase 2 — Advanced Intelligence**

| Step | Build | Gate |
| :---- | :---- | :---- |
| 2A | Session memory architecture | Memory compiles and sends correctly within token limits |
| 2B | Daily check-in system | Check-in saves all fields. Feeds trajectory data correctly. |
| 2C | Micro-commitment system | Commitment set, stored, checked at next session. Status updates correctly. |
| 2D | Behavior loop — reinforcement logic | Streak tracking, completion acknowledgment, pattern surfacing working. |
| 2E | Perception vs Reality detection — Insight Flags | All 5 flags detectable. Gidget behavior changes when flag is active. |
| 2F | Advanced trajectory analysis | Cycle and seesaw patterns detectable across 3+ reassessments. |

## **Phase 3 — Enterprise**

| Step | Build | Gate |
| :---- | :---- | :---- |
| 3A | Organization data type \+ org\_id field on User | Organization linkage working. No individual data exposed. |
| 3B | Aggregated OrgInsight calculation workflows | Aggregation runs correctly. Minimum group size enforced. No PII in output. |
| 3C | Enterprise dashboard — org overview | All org insight screens functional. Admin access correctly gated. |
| 3D | HR reporting export | Reports generate correctly. Anonymization verified by security review. |

| Uncloud360™  ·  PuP 360™ v2 Complete Master Build Brief 18 Sections  ·  Proven Under Pressure  ·  Dr. Sam  ·  April 2026  ·  Confidential |
| :---: |

