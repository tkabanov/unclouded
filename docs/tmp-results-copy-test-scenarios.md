# Results Screen Copy — test scenarios

**Spec:** `docs/Uncloud360_Results_Screen_Copy_All_Classifications.docx.md`  
**Override:** OVR-040 (`docs/product-overrides.md`)  
**Code:** `frontend/src/lib/classification.ts`, `OnboardingResults.tsx`, `DashboardAssessmentResultsCard.tsx`, `downloadOnboardingResultsPdf.ts`, `assessmentScoreStyle.ts`

## How to run

- Manual / browser: `/test-list docs/tmp-results-copy-test-scenarios.md`
- Unit layer first (optional): Vitest for `classification`, `assessmentScoreStyle`, share/PDF helpers

## Scope

| In scope | Out of scope |
|---|---|
| Static per-classification copy (name, tagline, tradeoff, What This Means, 3 focus areas) | Changing classification engine rules |
| Dynamic: first name, scores, top-2 recommended paths | Module preview scheduler (separate OVR) |
| Score color thresholds (&lt;3.2 / 3.2–3.7 / ≥3.8) | Recovery / Grief pills (smoke only if present) |
| Standing 988 disclaimer on every results surface | Share-card layout beyond classification key/name |
| Surfaces: Onboarding Results, Dashboard assessment card, onboarding results PDF | Dashboard showing recommended paths (not in current card UI) |

## Auth / prep

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Default QA users | `sub-free@test.com` / `sub-pro@test.com` / `sub-premium@test.com` — password `qwerty123` |
| Entry | Complete onboarding to Step 12 **or** login with seeded `profiles.results.classification.key` |

### Score profiles to hit each classification (engine)

| Classification key | Orienting condition |
|---|---|
| `capacity_erosion` | Stability &lt; 3.0 + pressure profile «System Overload» |
| `high_output_hidden_instability` | Stability &lt; 3.2, Performance ≥ 3.5 |
| `alignment_fracture` | Alignment &lt; 3.0, Performance ≥ 3.0 |
| `performance_stagnation` | Performance &lt; 3.0, Stability ≥ 3.0 |
| `optimization_ready` | Stability, Performance, Alignment all ≥ 3.8 |
| `building_momentum` | All three ≥ 3.5, not Optimization Ready |
| `comfortable_plateau` | Stability ≥ 3.2, Performance ≥ 3.0, Alignment ≥ 3.0 (below momentum) |

### Standing disclaimer (exact)

> Uncloud360 provides AI-powered coaching guidance only — not therapy, diagnosis, or medical advice. If you are in crisis, please call or text 988.

---

## 0. Cross-cutting

### RES-COMMON-001 — Dynamic fields (header, scores, paths) — TESTED

| | |
|---|---|
| **Preconditions** | Any completed assessment / onboarding results screen with known first name + scores. |
| **Steps** | Open Onboarding Results (Step 12). Note header, three score gauges, Recommended paths list. |
| **Expected** | Header = `Here's what we're seeing, {First Name}.` Scores = Stability / Performance / Alignment from assessment, shown as `X.X` / 5. Exactly **top 2** path names (engine matches first; else dashboard-config fallback). |

### RES-COMMON-002 — Score color thresholds — TESTED

| | |
|---|---|
| **Preconditions** | User(s) or fixtures with scores at/near boundaries: `3.19`, `3.2`, `3.7`, `3.79`, `3.8`. |
| **Steps** | Inspect score text/bar colors on Onboarding Results and Dashboard card. Optionally open PDF. |
| **Expected** | &lt; 3.2 → amber/red (`destructive`). 3.2–3.7 → neutral gray. ≥ 3.8 → green. Same thresholds in PDF RGB bars. |

### RES-COMMON-003 — Standing disclaimer on every surface — TESTED

| | |
|---|---|
| **Preconditions** | Any classification on Onboarding Results and Dashboard card. |
| **Steps** | Scroll to bottom of results content on both surfaces; download PDF once. |
| **Expected** | Exact disclaimer text above. Visually separated (divider / whitespace). Present regardless of classification. Same on PDF. |

### RES-COMMON-004 — Live copy when profiles.results JSONB is stale — TESTED

| | |
|---|---|
| **Preconditions** | Profile whose `results.classification` has valid `key` but outdated/missing `whatThisMeans` / `tradeoff` / `focusAreas` (or old `description`-only shape). |
| **Steps** | Open Dashboard assessment card (and Onboarding Results if reachable). |
| **Expected** | UI shows **current** copy from `classification.ts` for that key via `resolveClassificationCopy` — not the stale JSONB strings. |

### RES-COMMON-005 — No copy swap between classifications — TESTED

| | |
|---|---|
| **Preconditions** | Two users (or sequential runs) with different classification keys. |
| **Steps** | Compare name / tagline / tradeoff / What This Means / focus areas. |
| **Expected** | Zero shared paragraphs that belong to the other classification. Do not swap copy. |

---

## 1. Per-classification copy (Onboarding Results + Dashboard)

For each scenario below: assert **name, tagline, tradeoff, What This Means, three focus areas** 1:1 with the spec doc. Paths: prefer engine top-2; if fallback, expect the listed names. Disclaimer = RES-COMMON-003.

### RES-C1 — High Output / Hidden Instability — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `high_output_hidden_instability` (see score table). |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** High Output / Hidden Instability. **Tagline:** You're delivering on the outside. Internally, the gap between how you look and how you feel is where the real work begins. **Tradeoff:** Right now, your output is outpacing your foundation. The question isn't whether you can keep performing — you clearly can. It's whether the pace you're keeping is one you can actually sustain. **What This Means:** You're performing well and people around you likely have no idea what it's costing you. That's the nature of this pattern — it doesn't announce itself. Naming it now, before it does, is exactly the right move. **Focus areas:** (1) Close the gap between external performance and internal state (2) Reintroduce honest self-check-ins without judgment (3) Build sustainable rhythms that match your actual capacity — not your output expectations. **Paths fallback:** High Performance Sustainability; Stress Regulation Foundations. **Color note:** Stability/Alignment &lt;3.2 amber; Performance ≥3.8 green when applicable. |

### RES-C2 — Capacity Erosion — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `capacity_erosion`. |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Capacity Erosion. **Tagline:** You've been carrying more than your system can sustainably hold. The fact that you're still functioning is a testament to your resilience — and also the problem. **Tradeoff:** Right now, functioning is the goal. Growth costs energy that doesn't currently exist. The most important thing you can do right now is stop asking yourself to do more — and start asking yourself what can come off. **What This Means:** This isn't a discipline problem or a mindset problem. Your system is genuinely depleted. Pushing harder from here doesn't produce more — it produces breakdown. The first work is stabilization, not optimization. **Focus areas:** (1) Stabilize before anything else — no new goals, no new commitments right now (2) Identify what is draining you that can be reduced, removed, or redistributed (3) Build one small recovery practice that actually fits your current life. **Paths fallback:** Stress Regulation Foundations; Sleep & Recovery Basics. **Color note:** Stability &lt;3.2 red/amber. |

### RES-C3 — Alignment Fracture — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `alignment_fracture`. |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Alignment Fracture. **Tagline:** Something deeper is off. You may be functioning, or even performing — but the life you're living doesn't quite fit the person you know yourself to be. **Tradeoff:** Right now, the gap between who you are and how you're living is the source of the friction. It's not a performance problem. It's an alignment problem — and those require a different kind of work. **What This Means:** The discomfort you're feeling isn't a sign that something is wrong with you. It's a signal that something important is out of place. The work here isn't to fix yourself — it's to find the thread and follow it back to what actually matters. **Focus areas:** (1) Name what is misaligned before trying to change it (2) Reconnect with the values that have always been non-negotiable for you (3) Build small, daily proof points that your life can start to reflect who you actually are. **Paths fallback:** Values Excavation; Purpose Discovery. **Color note:** Alignment &lt;3.2 amber; scores ≥3.8 green when applicable. |

### RES-C4 — Performance Stagnation — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `performance_stagnation`. |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Performance Stagnation. **Tagline:** You know what you need to do. The gap between knowing and doing is where the real work lives. **Tradeoff:** Right now, understanding isn't the problem — execution is. More insight won't close the gap. Structure, accountability, and a different relationship with starting will. **What This Means:** This isn't a motivation problem and it isn't a character flaw. You're navigating a very specific pattern — and the approaches you've been using to break through it are probably the same ones that haven't worked before. Something different is needed here, not more of the same. **Focus areas:** (1) Identify the specific point where follow-through breaks down — the gap is almost always in the same place (2) Build accountability structures that don't depend on willpower alone (3) Make the next action smaller than feels necessary — then do it. **Paths fallback:** Clarity & Priority Reset; Follow-Through Systems. **Color note:** Performance &lt;3.2 amber; Stability/Alignment ≥3.8 green when applicable. |

### RES-C5 — Comfortable Plateau — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `comfortable_plateau`. |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Comfortable Plateau. **Tagline:** Things are okay. And okay usually has a quiet, accumulating cost that doesn't announce itself until it's been sitting there a long time. **Tradeoff:** Right now, comfort is real — but so is the cost of staying still. The question isn't whether things are bad. It's whether this is actually the life you want, or whether you've quietly stopped asking that question. **What This Means:** You're not in crisis. There's nothing obviously wrong. And that's exactly what makes this pattern easy to miss. The friction isn't pain — it's a low-grade sense that you're capable of more than this, and that you've been trading that potential for stability. That's worth looking at honestly. **Focus areas:** (1) Name honestly what okay is costing you — not dramatically, just truthfully (2) Identify the one area where you've stopped pushing that used to matter most (3) Take one step toward growth that feels slightly uncomfortable — not a leap, a step. **Paths fallback:** Life Direction Reset; Values Excavation. **Color note:** Mid-range scores neutral gray; no green/red required by this classification’s typical band. |

### RES-C6 — Building Momentum — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `building_momentum`. |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Building Momentum. **Tagline:** You're oriented toward growth and things are moving. The work now is consistency — keeping what's working working. **Tradeoff:** Right now, the gap isn't direction — it's consistency. You know where you want to go. The question is whether the habits and structures you have in place are strong enough to get you there without depending on motivation to show up every day. **What This Means:** This is a genuinely good place to be. You have momentum and you have orientation — that combination is rarer than it sounds. The risk at this stage isn't falling behind. It's overextending, losing the thread, or getting distracted by what looks like a better path. Protect what's working while you build. **Focus areas:** (1) Identify your one highest-leverage action and protect time for it (2) Build the return into every commitment — not if you miss a day, when (3) Watch for the patterns that have knocked you off course before and name them before they do it again. **Paths fallback:** Follow-Through Mastery; Strategic Focus System. **Color note:** ≥3.8 green; 3.2–3.7 neutral; &lt;3.2 amber. |

### RES-C7 — Optimization Ready — TESTED

| | |
|---|---|
| **Preconditions** | Classification key `optimization_ready` (all three scores ≥ 3.8). |
| **Steps** | Open Onboarding Results; then Dashboard assessment card. |
| **Expected** | **Name:** Optimization Ready. **Tagline:** Your foundation is solid and you're genuinely ready to stretch. The question now is where to apply the edge. **Tradeoff:** Right now, the ceiling isn't your capacity — it's your clarity about where to push. You have the foundation. The work is precision: identifying where the highest-leverage growth lives and going there with full commitment. **What This Means:** You're operating from a strong base. This isn't the moment for more reflection or more analysis — it's the moment to move. The most valuable thing you can do right now is identify the one area where you're most ready to stretch and commit to it fully, rather than distributing effort across everything equally. **Focus areas:** (1) Identify the one dimension — professional, relational, or personal — where growth would create the most meaningful change (2) Set a 90-day target that requires you to stretch, not just maintain (3) Build in a challenge mechanism — someone or something that will hold you to the higher standard. **Paths fallback:** Optimization Protocol; Strategic Focus System. **Color note:** All three Stability / Performance / Alignment gauges green (≥3.8) — only classification where all three are green by design. |

---

## 2. Surfaces

### RES-SURF-001 — Onboarding → Dashboard parity — TESTED

| | |
|---|---|
| **Preconditions** | Fresh onboarding completion; land on Step 12, then continue to dashboard. |
| **Steps** | Capture name, tagline, tradeoff, What This Means, focus areas on Step 12. Click «Go to my dashboard». Open assessment results card. |
| **Expected** | Same classification key and same static copy blocks as Step 12. Scores match. Disclaimer present. |

### RES-SURF-002 — Onboarding results PDF — TESTED

| | |
|---|---|
| **Preconditions** | Dashboard shows assessment results; PDF button available. |
| **Steps** | Click PDF download; open generated file. |
| **Expected** | Classification name, scores (with threshold colors), tradeoff, What This Means, focus areas, and standing disclaimer match live Dashboard card / OVR-040. |

### RES-SURF-003 — Recommended paths only required on Onboarding Results — TESTED

| | |
|---|---|
| **Preconditions** | Onboarding Results with classification that has dashboard-config fallback paths. |
| **Steps** | Confirm paths list on Step 12. Confirm Dashboard card content. |
| **Expected** | Step 12 shows exactly 2 recommended path names. Absence of paths on Dashboard card is **not** a fail (current UI does not render them there). |

---

## 3. Unit / automated smoke (optional gate before E2E)

### RES-UNIT-001 — classifications map vs spec — TESTED

| | |
|---|---|
| **Preconditions** | Repo checkout with `frontend/src/lib/classification.ts`. |
| **Steps** | Run Vitest covering `classifications` / `resolveClassificationCopy` / `resolveRecommendedPathNames` / score style helpers; or assert strings manually against the spec doc. |
| **Expected** | All 7 keys present; name, tagline, tradeoff, whatThisMeans, focusAreas match doc. `STANDING_RESULTS_DISCLAIMER` exact. Score helpers honor boundaries 3.2 / 3.8. |

### RES-UNIT-002 — computeClassification smoke (reachability) — TESTED

| | |
|---|---|
| **Preconditions** | Same as RES-UNIT-001. |
| **Steps** | Feed one score/pressure fixture per classification key into `computeResults` / classification path. |
| **Expected** | Each of the 7 keys is reachable. Engine rules unchanged (OVR-040). |

---

## Suggested run order

1. RES-UNIT-001 → RES-UNIT-002  
2. RES-COMMON-002, RES-COMMON-003  
3. RES-C7 (all-green visual)  
4. RES-C2, RES-C1  
5. RES-C3 → RES-C6  
6. RES-COMMON-004, RES-COMMON-005  
7. RES-SURF-001 → RES-SURF-003  

## Pass / fail

| Result | Criteria |
|---|---|
| **PASS** | Static blocks 1:1 with spec; dynamic name/scores/paths correct; disclaimer everywhere; colors by threshold; no cross-classification swap; surface parity (where applicable). |
| **FAIL** | Wrong paragraph, missing focus bullet, missing disclaimer, score color outside threshold, stale JSONB copy shown when key is valid, or onboarding/dashboard copy mismatch for same key. |
| **BLOCKED** | Cannot reach results (auth, onboarding incomplete, no fixture for target classification). |
)
