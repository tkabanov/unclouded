**Uncloud360™**

**Developer FAQ and Example Paths**

*Behavioral Fingerprint Logic  ·  AI Mode Priority Rules  ·  3 Complete Example Paths with Full Content*

|  | PURPOSE This document answers three developer questions that were not fully covered in the existing documentation: how to handle unmatched behavioral fingerprint combinations, how to resolve AI coaching mode conflicts, and how path content is structured. Three complete example paths with full session content are provided. |
| :---- | :---- |

| QUESTION 1 — BEHAVIORAL FINGERPRINT FALLBACK LOGIC |
| :---: |

## **The Problem**

The 13 defined behavioral fingerprints are specific combinations of pressure\_response\_pattern × non\_followthrough\_reason. Because more combinations are possible than are defined, some user inputs will not match any of the 13\. The build brief did not specify what to do in these cases.

## **The Solution — Three-Step Fallback**

| // BEHAVIORAL FINGERPRINT ASSIGNMENT — run after onboarding // Input: User.pressure\_response\_pattern \+ User.non\_followthrough\_reason // STEP 1: Try exact match against the 13 defined combinations fingerprint \= lookup(pressure\_response\_pattern, non\_followthrough\_reason) // STEP 2: If no exact match, fall back to pressure\_response\_pattern alone IF fingerprint is null:   IF pressure\_response\_pattern \= 'Overthink':     fingerprint \= 'Analytical / Paralyzed'   ELSE IF pressure\_response\_pattern \= 'Seek support':     fingerprint \= 'Collaborative / Diffuse Focus'   ELSE IF pressure\_response\_pattern \= 'Push through':     fingerprint \= 'Driver / Depletion Risk'   ELSE IF pressure\_response\_pattern \= 'Withdraw':     fingerprint \= 'Avoidant / Shutdown'   ELSE IF pressure\_response\_pattern \= 'Adapt':     fingerprint \= 'Situationally Adaptive' // STEP 3: If still null (missing input), use safe default IF fingerprint is null:   fingerprint \= 'Situationally Adaptive' // Save to User record User.behavioral\_fingerprint \= fingerprint |
| :---- |

## **The 13 Defined Combinations — Reference Table**

| Pressure Response Pattern | Non-Followthrough Reason | Behavioral Fingerprint |
| :---- | :---- | :---- |
| Overthink | Overwhelm | Analytical / Paralyzed |
| Overthink | Wrong direction | Analytical / Direction Seeker |
| Overthink | Motivation gap | Analytical / Motivation Gap |
| Seek support | Lack of direction | Collaborative / Direction Seeker |
| Seek support | No accountability | Collaborative / Diffuse Focus |
| Seek support | Momentum loss | Collaborative / Sustain Gap |
| Push through | Burnout / depletion | Driver / Depletion Risk |
| Push through | Capacity ceiling | Driver / Capacity Ceiling |
| Push through | Scattered focus | Driver / Scattered |
| Withdraw | Conditions not right | Avoidant / Conditional |
| Withdraw | Overwhelm | Avoidant / Shutdown |
| Withdraw | Wrong direction | Avoidant / Misaligned |
| Adapt | Any | Situationally Adaptive |

|  | KEY POINT The behavioral fingerprint is internal data only. It is never shown to the user. It is used solely in the AI prompt to adjust coaching approach. An imperfect fingerprint on an edge case does not break anything visible. Situationally Adaptive as a fallback is always safe — it makes no strong behavioral assumption. |
| :---- | :---- |

| QUESTION 2 — AI COACHING MODE PRIORITY RULES |
| :---: |

## **How Modes Work — Primary vs Overlay**

There are two categories of coaching mode. Primary modes are mutually exclusive — only one runs at a time. Overlay modes stack on top of the primary mode and do not replace it.

| Mode | Type | Activates when |
| :---- | :---- | :---- |
| Stabilizer | Primary | stability\_score \< 3.2 |
| Rebuilder | Primary | alignment\_score \< 3.2 AND stability\_score \>= 3.2 |
| Simplifier | Primary | performance\_score \< 3.2 AND stability\_score \>= 3.2 AND alignment\_score \>= 3.2 |
| Strategist | Primary | All three scores \>= 3.8 |
| Stabilizer (default) | Primary | None of the above conditions met |
| Protector | Overlay — always stacks | recovery\_mode\_active \= yes OR grief\_mode\_active \= yes |
| Simplifier (overlay) | Overlay — stacks on primary | cognitive\_load\_signal \= high |

## **Complete Mode Assignment Logic**

| // AI COACHING MODE ASSIGNMENT — run after onboarding score calculation // ── STEP 1: Assign primary mode (one only, top-to-bottom priority) ── IF stability\_score \< 3.2:   User.ai\_coaching\_mode \= 'stabilizer'   // Stabilizer is highest priority — any instability triggers it ELSE IF alignment\_score \< 3.2:   User.ai\_coaching\_mode \= 'rebuilder'   // Only runs when stability is okay but alignment is low ELSE IF performance\_score \< 3.2:   User.ai\_coaching\_mode \= 'simplifier'   // Only runs when both stability and alignment are okay ELSE IF stability\_score \>= 3.8        AND performance\_score \>= 3.8        AND alignment\_score \>= 3.8:   User.ai\_coaching\_mode \= 'strategist'   // All scores strong — user is ready for growth-focused coaching ELSE:   User.ai\_coaching\_mode \= 'stabilizer'   // Default fallback — stabilizer is always safe // ── STEP 2: Set overlay flags (independent, can stack on any primary) ── // Protector overlay IF recovery\_mode\_active \= yes OR grief\_mode\_active \= yes:   User.protector\_active \= yes // Protector adds its prompt block AFTER the primary mode block // It does not replace the primary mode // Simplifier overlay IF cognitive\_load\_signal \= 'high':   User.simplifier\_overlay\_active \= yes // Simplifier overlay adds its prompt block AFTER protector (if active) // It stacks on top of everything else // ── STEP 3: Prompt assembly uses both primary \+ overlays ── // See Section 5 of Technical Spec for full assembly order |
| :---- |

## **Worked Examples**

| Scenario | Scores / Flags | Primary Mode | Overlays | What the user experiences |
| :---- | :---- | :---- | :---- | :---- |
| Classic Capacity Erosion | S:1.6 P:2.1 A:1.8 | Stabilizer | None | Slow, grounding, regulation-first coaching. No goals, no strategy. |
| High performer in recovery | S:4.1 P:4.3 A:3.9 \+ recovery flag | Strategist | Protector | Strategist coaching tone but with recovery sensitivity layered over everything. The AI can be direct and challenging but never at the expense of the recovery context. |
| Depleted AND cognitively overloaded | S:2.4 P:2.8 A:3.1 \+ cognitive\_load=high | Stabilizer | Simplifier overlay | Stabilizer runs as primary — slow, grounding. Simplifier makes responses even shorter and simpler. Dual protection against overwhelm. |
| Grief AND performance stagnation | S:3.4 P:2.6 A:3.2 \+ grief flag | Simplifier (primary) | Protector overlay | Performance coaching in simplified form with grief-aware protection layered on. The AI addresses the professional goals but with the pace and sensitivity that grief requires. |
| All scores mid-range, no flags | S:3.3 P:3.4 A:3.5 | Stabilizer (default) | None | Default stabilizer — safe, grounded, not pushing. This user isn't in crisis but doesn't meet Strategist threshold. Stabilizer holds the space without pressure. |
| No conditions met clearly | S:3.6 P:3.7 A:3.4 | Stabilizer (default) | None | Close to Strategist but not quite. Default to Stabilizer. Better to be safe than to push when the scores are borderline. |

|  | DEVELOPER NOTE — PROMPT ASSEMBLY The primary mode determines which mode prompt block is appended (Layer 3 in the assembly order). Protector overlay adds the Protector prompt block as Layer 4\. Simplifier overlay adds the Simplifier prompt block as Layer 5\. Multiple layers can be active simultaneously. See Technical Spec Section 5 for the full 24-layer assembly order. |
| :---- | :---- |

| QUESTION 3 — THREE COMPLETE EXAMPLE PATHS |
| :---: |

Three complete paths are provided below with full session content — coaching text, reflection questions, and micro-commitment for every session. These serve two purposes: they give the developer a concrete reference for what data goes in each PathSession field, and they give Dr. Sam a content template and tone reference for writing the remaining paths.

|  | HOW TO READ THESE Each session shows three color-coded blocks: blue (coaching text — stored in PathSession.coaching\_text), purple (reflection questions — stored in PathSession.question\_1/2/3), green (micro-commitment — stored in PathSession.micro\_commitment and copied to User.micro\_commitment\_active when user taps Set as My Focus). |
| :---- | :---- |

| PATH 1 OF 3  —  FREE TIER Getting Through Hard Seasons *Pillar: Emotional Well-being  ·  Sub-mode: General Emotional  ·  6 Sessions  ·  Classification: Capacity Erosion · Alignment Fracture  ·  No flag required* |
| :---- |

### **Path Rules and Requirements**

| Rule | Value |
| :---- | :---- |
| GuidedPath.tier | free |
| GuidedPath.pillar | emotional |
| GuidedPath.sub\_mode | general |
| GuidedPath.classification\_match | \['Capacity Erosion', 'Alignment Fracture'\] |
| GuidedPath.trigger\_signals | Auto-enrolled at onboarding if classification matches AND pillar \= emotional |
| GuidedPath.session\_count | 6 |
| GuidedPath.is\_mvp | true |
| GuidedPath.phase | 1 |
| Flag required | None — available to all users matching classification |
| Tier gating | All 6 sessions available to Free users |
| Enrollment trigger | Onboarding completion workflow — Step 1 (primary enrollment) |
| AI coaching mode when in this path | Stabilizer (stability\_score \< 3.2 triggers this path AND this mode) |

| S1 | Understanding what hard seasons actually are *Session 1* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Hard seasons don't announce themselves. They tend to arrive gradually — you just notice one day that everything feels heavier than it used to. The things that used to restore you aren't restoring you. The pace you used to sustain feels impossible. And somewhere underneath all of it is a quiet voice wondering if something is wrong with you.* *Nothing is wrong with you. You are in a hard season. That is different.* *A hard season is a period where the load exceeds the capacity. It is not a character flaw, a weakness, or a sign that you are falling apart. It is a signal — from your body, your nervous system, your life — that something needs to change. The season is telling you something. The first step is simply learning to hear it.* *Most people in hard seasons do one of two things. They push through — keeping the same pace, telling themselves they just need to work harder or rest better or get themselves together. Or they shut down — withdrawing, avoiding, going through the motions without actually being present. Neither of these works.* *There is a third option. It does not require you to have it figured out. It just requires you to be honest about where you actually are. That is where we start.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  When you think about the past few weeks, what has felt the heaviest? Name it as specifically as you can. Q2  What have you been telling yourself about why you're struggling — what story are you running about yourself right now? Q3  What is one thing you wish someone understood about what you're carrying? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: notice one moment when you push through something instead of acknowledging it. Just notice. You don't have to change it yet — just see it. |

| S2 | Permission to slow down without falling apart *Session 2* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *There is a difference between slowing down and stopping. Between rest and collapse. Between allowing yourself to be in a hard season and giving up on yourself.* *Most people in hard seasons are afraid that if they slow down, everything will fall apart. The work won't get done. The people depending on them will notice. They'll fall so far behind they can't catch up. So they keep the pace even when the pace is destroying them.* *Here is what is actually true: the pace you are keeping right now is already costing you more than you are getting from it. The slowdown has already started — it is just happening in ways you can't fully see yet. Your sleep, your patience, your clarity, your energy — these are already affected. Slowing down deliberately is not giving in. It is choosing when and how the adjustment happens, rather than waiting for your body or your life to make the choice for you.* *Slowing down does not mean everything stops. It means deciding what actually has to happen and what can wait. It means protecting one thing — just one — that restores you. It means dropping the performance of being fine and being honest about what you actually have to give right now.* *You are allowed to do less. That is not failure. That is survival. And survival, right now, is the goal.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What are you most afraid will happen if you slow down? Q2  If you were advising a close friend in exactly your situation, what would you tell them they're allowed to let go of right now? Q3  What is one thing you are currently doing that is costing more than it is giving? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: identify one thing from your list that you can do less of — not permanently, just this week. Do it less. Notice what happens. |

| S3 | The minimum viable day — what actually matters right now *Session 3* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *When everything feels like too much, the question is not how to do everything. The question is what actually has to happen.* *Most people, when overwhelmed, have a list of obligations that they treat as equally urgent. Everything on the list feels important because everything on the list is real. But not everything on the list has the same consequence if it doesn't happen. Some things, if they don't happen today, will create real problems. Most things, if they don't happen today, will still be there tomorrow.* *The minimum viable day is the version of your day that keeps the most important things going without requiring you to perform at a level you currently cannot sustain. It is not a lazy day. It is a realistic day. It is a day designed by someone who knows what they actually have to give, rather than designed by the aspirational version of themselves who ignores what they feel.* *To find your minimum viable day, you need to be honest about two things: what genuinely cannot wait, and what you have been treating as essential that is actually optional. Most people, when they do this honestly, find that the non-negotiable list is shorter than they thought. And the relief that comes from that recognition is real.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  List three things that genuinely cannot go undone this week — the ones where skipping them creates real consequences. Q2  List three things you've been treating as essential but could probably wait, be delegated, or be dropped entirely. Q3  What does a realistic day look like for you right now — not ideal, not aspirational, just genuinely doable? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: write your minimum viable day for tomorrow. Just tomorrow. Three things that have to happen, and permission to leave the rest. |

| S4 | Finding one small anchor in the chaos *Session 4* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *When everything is unstable, the impulse is to try to stabilize everything at once. That impulse is understandable. It is also part of why hard seasons feel so relentless — the scale of what needs to be different makes any single step feel inadequate.* *The anchor principle is the opposite of that. Instead of trying to stabilize everything, you identify one thing — one practice, one rhythm, one commitment — that you can hold even when everything else is shifting. Not because one thing will fix everything. But because one reliable thing in an unreliable period changes the felt experience of the season.* *The anchor can be small. It should be small. A walk at the same time every morning. Making your bed. Eating something real before noon. Calling one person. Going to bed before midnight. The specific thing matters less than the reliability. The anchor works because it is something you do when you feel like doing it and when you don't. Its value is in the consistency, not in the content.* *When you have an anchor, you have evidence — physical, repeated evidence — that you can do something. That might sound like nothing. In a hard season, it is everything.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What is one thing you have managed to keep going even through this difficult period — something small that you have not completely let go of? Q2  What is one small practice that, when you do it consistently, makes everything else feel slightly more manageable? Q3  What would you need to make that practice non-negotiable this week — what would have to be true? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: choose your anchor. One small thing. Do it every day this week regardless of how you feel. Report back. |

| S5 | Reaching out without feeling like a burden *Session 5* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *One of the most common experiences of hard seasons is isolation. Not always external isolation — plenty of people in hard seasons are surrounded by others. But an internal isolation. The sense that what you are carrying is yours alone to carry. That telling someone would burden them, worry them, or change how they see you.* *This belief is almost always wrong. And it is costing you more than you know.* *The people who love you — or who care about you, or who would want to know — are generally not as fragile as you are treating them. They can hold what you are carrying if you give them the chance. What they cannot do is help with something they don't know exists. Your silence is not protecting them. In most cases, it is just protecting you from the vulnerability of being known.* *Reaching out does not require you to have the words perfectly. It does not require you to know what you need. It can be as simple as: I've been having a hard time and I wanted to tell you that. That is it. You don't have to ask for anything. You don't have to explain everything. Just break the isolation. That is enough.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  Who in your life would genuinely want to know that you are having a hard time right now? Q2  What stops you from reaching out to them — what is the specific fear or concern? Q3  What is the smallest version of reaching out that feels possible — not the full conversation, just the first move? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: reach out to one person. It can be a text. It can be three sentences. Just break the isolation once. |

| S6 | What forward looks like when you're depleted *Session 6* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Forward does not always look like progress. In a hard season, forward can look like maintaining. Like not losing more ground. Like keeping one thing going. Like getting through the day and being slightly more honest about how you feel. These count.* *The trap of hard seasons is that people measure forward against the version of themselves that existed before the season started. They compare current output to peak output. Current energy to peak energy. And by that measure, they are always failing. They are always behind. They are always not enough.* *The more useful measure is: compared to where I was at the lowest point of this hard season, what is different? What am I doing now that I couldn't do then? What has held? What has slowly gotten easier? What have I learned about myself in this period that I didn't know before?* *Hard seasons end. Most of them. And when they do, something is usually different — not just in your circumstances but in you. Not because hard seasons are good. They aren't always. But because surviving something genuinely difficult changes you, whether you choose it or not. The question is whether you let it change you in a direction you would choose.* *You made it through this path. That is not nothing.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  Looking back at the past few weeks since you started this path — what is one thing that feels even slightly different? Q2  What have you learned about yourself during this hard season that you didn't know before, or didn't believe before? Q3  What is the one thing you most want to carry forward from this period into whatever comes next? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** Closing commitment — no action required: You made it through this path. Before your next coaching session, take five minutes to write down one thing you are proud of from this hard season. It doesn't have to be big. |

| PATH 2 OF 3  —  FREE TIER Burnout Recovery *Pillar: Professional  ·  Sub-mode: Stress and Burnout  ·  6 Sessions  ·  Classification: Capacity Erosion · High Output/Hidden Instability  ·  No flag required* |
| :---- |

### **Path Rules and Requirements**

| Rule | Value |
| :---- | :---- |
| GuidedPath.tier | free |
| GuidedPath.pillar | professional |
| GuidedPath.sub\_mode | stress\_burnout |
| GuidedPath.classification\_match | \['Capacity Erosion', 'High Output/Hidden Instability'\] |
| GuidedPath.trigger\_signals | Auto-enrolled when classification matches AND primary\_pillar \= professional |
| GuidedPath.session\_count | 6 |
| GuidedPath.is\_mvp | true |
| Flag required | None |
| Tier gating | All 6 sessions available to Free users |
| Important note | Do NOT use productivity language in this path or in AI sessions when this path is active. Stabilizer or Simplifier mode will be running — no optimization language. |
| AI mode | Stabilizer (Capacity Erosion) or Stabilizer (High Output/Hidden Instability — sustainability focus) |

| S1 | Naming what happened — burnout, not weakness, not failure *Session 1* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Burnout is not a personal failing. It is what happens when output exceeds input for long enough that the system can no longer compensate.* *You did not burn out because you are weak. You burned out because you kept giving when there was less and less to give from. Because you prioritized output over restoration. Because the demands were real and you met them — until you couldn't anymore. That is not a character flaw. That is a system responding rationally to an unsustainable condition.* *The word burnout is important. Not exhaustion, not stress, not a rough patch, not needing a vacation. Burnout. Burnout is different in degree and in what it requires to recover from. Exhaustion improves with sleep. Burnout requires a more significant recalibration — of pace, of expectations, of what you ask of yourself and what you protect.* *Naming it accurately matters because the wrong name leads to the wrong response. If you call it exhaustion, you take a weekend off and go back to the same pace. If you call it burnout, you understand that something has to actually change.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  In your own words, what happened? Not the events — the internal experience of the past weeks or months. Q2  What kept you going past the point where you should have slowed down? What made stopping feel impossible or wrong? Q3  What word would you use to describe where you are right now — and does burnout feel accurate? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: do not add anything new. Do not start a new project, a new habit, or a new commitment. The only goal this week is to not make it worse. |

| S2 | What your body and mind need right now *Session 2* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Recovery from burnout is not primarily a mental exercise. It is a physical and neurological process. Your body has been running in a state of chronic stress, and that has real physiological effects — on your sleep, your immune function, your hormones, your ability to concentrate, your emotional regulation. Recovery requires attending to these things, not just deciding to feel better.* *The sequence matters. Before you can rebuild anything, you need to stop the depletion. Before you can stop the depletion, you need to understand what is depleting you. Before you can make sustainable changes, your nervous system needs enough safety to actually regulate.* *This means that in early burnout recovery, the most important things are often the most basic: sleep, food, movement, reduced stimulation, time without demands. Not because these things are a cure, but because without them the conditions for recovery do not exist. You cannot think your way out of burnout. You can only create the conditions for your system to recover.* *The goal this week is not to fix anything. The goal is to give your body and nervous system something it has not had enough of: rest that is actually restful.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  How is your sleep right now — not what you think it should be, but what is actually happening? Q2  What does your body feel like right now, physically? Where are you holding tension, heaviness, or numbness? Q3  What does genuine rest look like for you — not passive consumption, but actually restorative? When did you last have that? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: protect one hour. One hour where there are no demands on you — no phone, no email, no tasks, no performance. Just one hour. |

| S3 | Removing one thing — just one *Session 3* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *The instinct when burned out is often to reorganize everything. To build a new system, find a new approach, restructure the whole schedule. This instinct is understandable and it is counterproductive.* *Reorganizing everything requires the kind of executive function, clarity, and energy that burnout takes from you. Trying to redesign your life when you are running on empty tends to produce either nothing — the planning never converts to action — or a new system that collapses quickly because the underlying depletion has not been addressed.* *The more useful approach is smaller and more specific. Not redesigning everything. Removing one thing.* *One thing that is costing more than it is giving. One obligation that you have been carrying not because it is essential but because you have not yet given yourself permission to put it down. One thing that, if it stopped being your responsibility this week, would create even a small amount of relief.* *One thing. Not ten things. Not a restructuring. One concrete removal.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What is the one thing in your current load that is costing the most and giving the least? Q2  What would you have to believe — about yourself, about others, about the consequences — to allow yourself to remove it or reduce it? Q3  What is the smallest possible reduction that would still feel like relief? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: remove or significantly reduce one thing from your load. It does not have to be permanent. Just this week. Tell one person what you are doing and why. |

| S4 | The minimum viable workday during recovery *Session 4* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *There is a version of your workday that keeps the most important things going without requiring more than you currently have. Finding it requires honesty about two things: what genuinely cannot wait, and what you have been treating as essential that could actually wait or be delegated.* *During burnout recovery, the minimum viable workday is not a lazy day or a half-effort day. It is a realistic day. It is what happens when you design your day around your actual capacity rather than your aspirational capacity or the expectations you have absorbed from others.* *For most people in burnout recovery, the minimum viable workday is shorter than they think. The most important work — the work that actually cannot wait, that only they can do, that has real consequences — usually takes three to four focused hours. The rest of the time is often spent managing the appearance of productivity, catching up on things that have lower urgency than they feel, and responding to demands that feel urgent but aren't actually critical.* *This is not permission to disappear. It is permission to be strategic about where your limited energy goes.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  If you had to identify the three things in your workday that absolutely cannot be dropped or delegated, what are they? Q2  What are you currently doing at work that someone else could do, or that could wait until you have more capacity? Q3  What would a realistic three-to-four hour focused workday look like for you right now — what would it include and what would it not include? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: design your minimum viable workday. Write it down. Try to live inside it for three days and notice what happens. |

| S5 | What returning to normal should actually look like *Session 5* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Most people who burn out return to exactly the conditions that caused the burnout. They rest for a period, feel somewhat better, and then go back to the same pace, the same expectations, the same patterns — because the conditions that made burnout possible have not actually changed.* *This is why burnout recurs. Not because the person is weak, but because they treated the symptom rather than the cause.* *Returning to normal — or to something that functions — requires being honest about what normal was actually costing you. The pace that felt sustainable until it wasn't. The expectations you met until you couldn't. The way you had been treating your capacity as infinite when it was not.* *A genuine return involves not just recovering but recalibrating. It means deciding in advance what you are not willing to go back to, what structural changes need to happen before you re-enter, and what early warning signs you will pay attention to this time. Without this, recovery is just a pause before the next burnout.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What was the old normal like — honestly? Not the version you told people, but the actual daily experience of it? Q2  What are you not willing to go back to? What has this experience made clear should not be part of your working life at this level? Q3  What would need to be different — structurally, not just in your mindset — for the return to be sustainable? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: write down two things you will not go back to. Make it specific. Keep the list somewhere you will see it. |

| S6 | Protecting yourself from the same pattern *Session 6* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Burnout is not a one-time event for most people who experience it. It is a pattern. And like all patterns, it has recognizable early signals — signals that showed up before the burnout was fully formed, that were visible in retrospect even when they were invisible in the moment.* *Learning to see those signals earlier — and taking them seriously before they become a crisis — is one of the most important things that can come from a burnout experience. Not the shame of having burned out, not the resolution to be stronger next time, but the specific knowledge of your personal early warning system.* *Your early warning signs are probably not dramatic. They tend to be small and easy to dismiss. The quality of your sleep starting to shift. The things that used to restore you stopping to work. A growing sense of dread before certain parts of your day. Increased irritability or emotional flatness. The feeling of performing normal when nothing feels normal.* *These signals are not problems. They are information. The difference between someone who burns out repeatedly and someone who breaks the pattern is often just whether they take the signals seriously before they become impossible to ignore.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  Looking back, what were the early signals of this burnout that you noticed but either dismissed or pushed through? Q2  What would it mean to take those signals seriously if they appear again — what would you actually do differently? Q3  What is one structural change — to your schedule, your commitments, your environment, or your relationship with work — that would make it harder for this pattern to repeat? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** Closing commitment: You completed this path. Write your personal early warning system — three specific signals that tell you burnout is building. Keep it somewhere you can find it. |

| PATH 3 OF 3  —  FREE TIER  ·  RECOVERY FLAG REQUIRED Recovery Roadmap *Pillar: Health and Wellness  ·  Sub-mode: Recovery and Sobriety  ·  6 Sessions  ·  All classifications  ·  Requires recovery\_mode\_active \= yes* |
| :---- |

### **Path Rules and Requirements**

| Rule | Value |
| :---- | :---- |
| GuidedPath.tier | free |
| GuidedPath.pillar | health |
| GuidedPath.sub\_mode | recovery |
| GuidedPath.classification\_match | All classifications — this path matches any classification |
| GuidedPath.trigger\_signals | REQUIRED: recovery\_mode\_active \= yes. This path is ONLY enrolled when the recovery flag is active. Do not enroll users without this flag. |
| GuidedPath.session\_count | 6 |
| GuidedPath.is\_mvp | true |
| Flag required | recovery\_mode\_active \= yes — MANDATORY |
| Tier gating | All 6 sessions available to Free users with recovery flag |
| AI mode | Protector overlay ALWAYS active alongside primary mode. Primary mode determined by scores as normal. |
| Critical developer note | NEVER surface recovery path content to users without recovery\_mode\_active \= yes. This path uses sobriety-specific language throughout. Surfacing it to non-recovery users would be confusing and potentially harmful. |
| SAMHSA resource | Always available: SAMHSA National Helpline 1-800-662-4357. Include in crisis resources regardless of tier. |

|  | IMPORTANT — AI BEHAVIOR IN THIS PATH When recovery\_mode\_active \= yes, the Protector mode overlay is active in all coaching sessions regardless of primary mode. The AI never raises substance use as a topic unless the user opens that door. In this path, the user has already indicated they are in recovery — so recovery context is present and the AI responds to it when relevant. SAMHSA-aware language throughout. No judgment. No probing for details. |
| :---- | :---- |

| S1 | You don't have to have it all figured out right now *Session 1* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Recovery does not require that you have the whole picture figured out before you start. It doesn't require that you know how you'll handle every situation, what you'll say to certain people, or how long this will take. It requires exactly one thing: that you keep going for the next small stretch of time.* *This is important because the full picture of recovery can feel overwhelming. When you look at everything that might need to change — relationships, environments, habits, identity — the scale of it can make any single step feel pointless. It can make starting feel impossible. It can make the whole thing feel like too much.* *So don't look at the whole picture right now. Just look at today. Or if today is too much, just look at the next few hours. The requirement is not that you do everything. The requirement is that you do this — this session, this reflection, this one thing in front of you.* *You are here. That is not nothing. That is actually the only thing that has to be true right now.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What brought you here today — not the whole story, just what made you take this step? Q2  When you think about recovery, what feels most possible right now? What feels most impossible? Q3  What does support look like for you — what kind of support actually helps versus what kind makes things harder? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: one day at a time. Your only commitment is to come back to this path for session 2\. |

| S2 | What early recovery actually looks like *Session 2* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Early recovery is not what it looks like from the outside, or what people who haven't experienced it assume it looks like. From the outside, it can look like someone who has stopped doing something and is now fine. From the inside, it feels different.* *Early recovery involves a body and nervous system that are recalibrating. It involves an emotional landscape that can shift significantly from hour to hour. It involves navigating situations, relationships, and internal states with tools that are still being developed. It is not a straight line. It is not consistent improvement. It is often two steps forward and one step back, or one step forward and standing still for a while.* *This is not failure. This is recovery. What looks like inconsistency from outside is actually the normal shape of how people heal from something that changed their brain chemistry and their relationship with themselves.* *The most important thing to know about early recovery is that it is a phase. Not a permanent state. The intensity of it — the cravings, the emotional variability, the difficulty of some moments — lessens over time for most people who stay with it. You will not always feel this new to it.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What has early recovery actually felt like for you — not what you expected, but the real experience? Q2  What has been harder than you expected? What has been easier or different than you thought? Q3  What is one thing that has helped, even slightly, in the moments that have been difficult? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: track your difficult moments. Not to judge them — just to notice when they happen, how long they last, and what (if anything) helped them pass. |

| S3 | Your one commitment for this week *Session 3* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Recovery works in small increments. Not because small things are all that matter, but because small things done consistently are what large things are built from.* *A commitment in recovery is different from a goal. A goal is something you achieve. A commitment is something you return to, even when you don't achieve it perfectly. The distinction matters because in recovery, the measure is not perfection — it is continuation. Coming back after a hard day. Getting through the next hour. Returning to the commitment even when you slipped away from it.* *Your commitment for this week should be specific enough to be real and small enough to be honest. Not 'I will be in perfect recovery' — that is not a commitment, it is a wish. Something like: I will check in on this path every day this week. I will call my sponsor when I feel like I might not make it. I will not be alone when I know I am in a high-risk moment. Something specific and yours.* *The point of the commitment is not to be perfect. It is to have something to return to when things are hard. A place to come back to.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What is the most important commitment you can make to your recovery this week — specific, honest, and yours? Q2  What makes that commitment hard to keep? What are the specific moments or conditions where it is most at risk? Q3  Who, if anyone, knows about this commitment? And would telling someone make it more likely you would keep it? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** Set your commitment: write it down. Tell one person. Come back to this path for session 4 this week. |

| S4 | When cravings hit — what to do in the moment *Session 4* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Cravings are not a sign that recovery is failing. They are a normal part of how the brain and body respond after changing a significant pattern. Understanding this matters because many people in recovery treat cravings as evidence that something is wrong with them — as weakness, as failure, as proof that they cannot do this. None of that is accurate.* *A craving is a brain signal. It is strong and it is real, but it is not permanent and it is not inevitable. Most cravings peak in intensity within 20 to 30 minutes and then subside, whether or not they are acted on. The feeling that the craving will never stop unless you act on it is a feature of cravings — it is not an accurate prediction.* *What helps in the moment is having a plan before the moment arrives. Not figuring out what to do when you are already in the middle of a craving — the cognitive resources available in that moment are limited. Having practiced responses ready before you need them is the difference between being swept along by the craving and having something to grab onto.* *The most effective craving responses are immediate, physical, and social. Move your body. Change your environment. Call someone. These are not complicated strategies. They work because they interrupt the cycle at the point where interruption is most possible.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What does a craving feel like for you — specifically, in your body and in your thoughts? Q2  What has helped you get through a craving in the past, even if just for long enough? Q3  Who can you call in the moment when a craving is strong? Do they know they are on that list? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** Build your crisis plan: write down two things you will do when a craving hits, and one person you will call. Keep it somewhere accessible — your phone, your wallet, somewhere you can find it in the moment. |

| S5 | Who is on your support team *Session 5* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *Recovery in isolation is significantly harder than recovery with support. This is not because people who attempt recovery alone are weaker or less committed — it is because human connection is one of the most powerful tools available in recovery, and going without it is like trying to build something without the most important material.* *Support in recovery does not look the same for everyone. For some people it is a formal program — AA, NA, SMART Recovery, or a similar community. For others it is a therapist, a sponsor, a counselor. For others it is a small number of people who know what is happening and who show up consistently. The form matters less than the fact of it — that someone knows, that someone is available, that you are not carrying this entirely alone.* *The honest question is not whether you have perfect support. Almost no one does. The honest question is whether the support you have is enough for where you are right now, and what would make it more adequate.* *Even one person who genuinely knows what you are going through and is on your side changes the experience of recovery.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  Who currently knows about your recovery — who is aware of what you are working through? Q2  Of the people who know, who shows up in a way that actually helps? What do they do that makes the difference? Q3  Is there someone who doesn't know yet who you think would be an important part of your support — and what would it take to tell them? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** This week: if there is someone who should know and doesn't, reach out to one of them. It can be a text. It can be three sentences. You don't have to explain everything. |

| S6 | The next 7 days — just the next 7 days *Session 6* |
| ----- | :---- |
|  | **PART 1 — COACHING TEXT  (stored in PathSession.coaching\_text)** *You made it through this path. That is worth saying clearly.* *Recovery does not require that you see the whole road ahead of you. It does not require that you have answers to every question, solutions to every challenge, or certainty about what comes next. It requires that you stay with it — one day, one decision, one moment at a time.* *The next seven days are what matter right now. Not the next seven months, not the next seven years. Seven days. You know from the sessions in this path what helps, what your risks are, who your support is, and what commitment you are holding. These are real tools. Not everything you will ever need, but real and usable for the next week.* *At the end of seven days, you will have more information — about what worked, what was harder than expected, what you still need. That information will shape what comes next. But you cannot get that information without going through the seven days.* *One day at a time is not a cliché. It is the actual strategy. The days add up.* |
|  | **PART 2 — REFLECTION QUESTIONS  (stored in PathSession.question\_1/2/3 — answers in PathResponse)** Q1  What do the next seven days require from you — what are the specific situations, people, or moments you will need to navigate? Q2  What will you do in the next seven days to support your recovery — specific, small, and honest? Q3  What would it mean to you to look back at this week from the other side and know that you made it through? |
|  | **PART 3 — MICRO-COMMITMENT  (stored in PathSession.micro\_commitment → copies to User.micro\_commitment\_active)** Your commitment for the next 7 days: write it down. Read it every morning this week. That is the whole plan. |

|  | FOR THE DEVELOPER These three example paths represent the complete data structure for all 55 paths. Each PathSession record contains: session\_number, session\_title, coaching\_text, question\_1, question\_2, question\_3, micro\_commitment. Content may be null at launch — display 'coming soon' state when null. PathResponse stores the user's answers. micro\_commitment copies to User.micro\_commitment\_active when user taps Set as My Focus. |
| :---- | :---- |

| Uncloud360™  ·  Developer FAQ and Example Paths Proven Under Pressure  ·  Dr. Sam  ·  April 2026  ·  Confidential |
| :---: |

