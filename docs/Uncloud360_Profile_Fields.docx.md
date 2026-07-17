  
**Uncloud360™**

**Developer Specification**

*Part 1: User Profile Fields · Part 2: Path-Specific Reassessment Questions*

*Proven Under Pressure LLC  ·  Confidential  ·  For Nare and the RapidDev team*

| PART 1: USER PROFILE FIELDS SPECIFICATION |
| :---: |

These fields extend the user's profile beyond what the PuP 360 onboarding assessment captures. They give the AI coaching system richer context about who the user is — their life stage, work situation, family context, and health — which shapes how the AI communicates without changing the classification or coaching mode. All fields are optional. None appear during onboarding. They are collected via a dedicated profile section in Settings.

|  | WHERE TO BUILD THIS A dedicated 'About You' or 'Your Profile' section within the Settings screen. Not during onboarding. Fields should be editable at any time. All values stored on the User data type in Supabase. The AI receives these fields as part of the session context block alongside classification, mode, and score data. |
| :---- | :---- |

# **Section 1 — Field Specifications**

Each field below includes the field name, data type, answer options, how the AI uses the value in session, and whether it is required.

| Field Name | Data Type | Options / Format | How AI Uses This in Session | Req? |
| :---- | :---: | :---- | :---- | :---: |
| **LIFE STAGE** |  |  |  |  |
| **age\_range** | *Dropdown* | Under 25 / 25–34 / 35–44 / 45–54 / 55–64 / 65+ | *Calibrates coaching language and life-stage assumptions. A 27-year-old in Alignment Fracture is navigating early identity formation. A 54-year-old in the same classification is navigating legacy and midlife transition. The AI shifts framing accordingly.* | No |
| **career\_stage** | *Dropdown* | Early Career (0–5 yrs) / Mid-Career / Senior/Leadership / Career Transition / Semi-Retired / Retired / Student / Not Applicable | *Shapes professional coaching tone. Early career \= skill-building and confidence framing. Senior/Leadership \= decision-making and sustainability framing. Retired \= purpose and identity framing.* | No |
| **gender\_identity** | *Dropdown \+ freetext* | Man / Woman / Non-binary / Prefer to self-describe (open text) / Prefer not to say | *Used only to apply correct pronouns in AI responses. No coaching differentiation by gender.* | No |
| **WORK CONTEXT** |  |  |  |  |
| **employment\_status** | *Dropdown* | Employed full-time / Employed part-time / Self-employed / Between roles / Student / Caregiver (full-time) / Retired / Other | *Changes what professional performance coaching means. 'Between roles' triggers transition-aware framing. 'Caregiver' surfaces the caregiving load in session without requiring re-explanation.* | No |
| **industry** | *Dropdown* | Healthcare / Technology / Finance / Legal / Education / Government or Military / Non-profit / Retail or Hospitality / Manufacturing / Real Estate / Other | *Provides occupational context. A healthcare professional in Capacity Erosion is in a system with specific burnout patterns. The AI can reference industry pressures accurately.* | No |
| **company\_size** | *Dropdown* | Solo / Freelance / 2–10 / 11–50 / 51–200 / 201–500 / 500+ / N/A | *Shapes organizational context. Solo operators face isolation and self-accountability challenges. Large org employees face hierarchy and political dynamics. AI applies appropriate framing.* | No |
| **work\_environment** | *Dropdown* | Remote / Hybrid / In-person / Varies | *Affects boundary and energy coaching. Remote workers face different boundary challenges than in-person workers. Relevant to Work-Life Integration and Energy Management paths.* | No |
| **manages\_a\_team** | *Boolean toggle* | Yes — I manage direct reports / No direct reports | *Activates leadership and management framing when relevant. A manager in Performance Stagnation may be protecting their team while falling behind themselves. AI can name this.* | No |
| **FAMILY AND RELATIONSHIPS** |  |  |  |  |
| **relationship\_status** | *Dropdown* | Single / In a relationship / Married or partnered / Separated or divorcing / Widowed / Prefer not to say | *Provides relational context without requiring explanation. Someone who is divorcing has different coaching needs than someone in a stable partnership even with the same classification scores.* | No |
| **parenting\_status** | *Dropdown* | No children / Children at home (under 18\) / Children — adult or independent / Caring for aging parent or family member / Multiple of the above | *Surfaces caregiving load the scores may not capture. A parent of young children in Capacity Erosion has structural constraints that require different coaching than a person without dependents.* | No |
| **chronic\_health\_condition** | *Dropdown* | Yes, this affects my daily life / Occasionally, but manageable / No / Prefer not to say | *Not used diagnostically. Signals the AI to be more body-and-energy aware in coaching and to avoid dismissive framing around physical capacity.* | No |
| **HEALTH CONTEXT** |  |  |  |  |
| **physical\_activity\_level** | *Dropdown* | Sedentary (little to no regular movement) / Lightly active / Moderately active / Very active | *Calibrates health and energy path recommendations. Also used in Body Connection and Energy Management paths to ground advice in the user's actual baseline.* | No |
| **state\_region** | *Dropdown \+ International option* | All 50 US states \+ District of Columbia \+ International (open text) | *Used for timezone-relevant features, future localization, and anonymized geographic aggregate data for enterprise reporting.* | No |
| **LOCATION** |  |  |  |  |
| **time\_zone** | *Auto-detected \+ user-confirmable* | Standard timezone list | *Enables correct timing for check-in reminders, milestone notifications, and future live session scheduling.* | No |

|  | AI CONTEXT BLOCK — HOW THESE FIELDS ARE PASSED All populated user profile fields should be appended to the session context block that is already passed to the AI at session open (alongside classification, scores, mode, fingerprint, and load signals). Format as a plain-text block: 'User context: age range 35–44, career stage Senior/Leadership, industry Healthcare, manages a team Yes, parenting status Children at home, relationship status Married.' Only populated fields are included — blank optional fields are omitted from the context block. |
| :---- | :---- |

# **Section 2 — UI and Data Model Notes**

### **Presentation in Settings**

•  Present as a dedicated 'Your Profile' or 'About You' card within the Settings screen.

•  Introductory text: 'Help your coach understand your world. The more context you share, the more your coaching experience is tailored to your actual life. All fields are optional and can be updated anytime.'

•  Group fields visually by category: Life Stage, Work, Family, Health, Location.

•  Progress indicator optional: 'Profile 6 of 14 fields complete' encourages completion without pressure.

### **Data Model**

•  All fields stored directly on the User table in Supabase.

•  Field names as listed in the spec above (snake\_case).

•  All fields nullable — no field is required at any point.

•  manages\_a\_team stored as boolean. All others stored as text/string (dropdown value or free text).

•  time\_zone auto-detected on account creation and stored; user can override in Settings.

### **Privacy**

•  Profile fields are never visible to enterprise HR administrators — they are individual user data only.

•  Profile fields are included in the user's personal data export if requested.

•  Profile fields are deleted when a user submits a data deletion request.

*Uncloud360™  ·  Proven Under Pressure LLC  ·  Developer Specification  ·  Confidential*