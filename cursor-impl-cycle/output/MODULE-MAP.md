# DrSam module map

Derived from `ir/inventory.json` and page/reusable slices for **drsam-99657**. Scope: authenticated user SPA (post-login). Excluded: `404` (AAU), stub page `0` (bTGwM).

| Module | Size | IR roots | Purpose | Surface |
|--------|------|----------|---------|---------|
| MOD-DRSAM-AUTH | large | AAL, bTGNI, bTGYf | reset_pw, onboarding wizard, index login entry | frontend |
| MOD-DRSAM-SHELL | medium | header, sidebar, offline_banner + page roots | Shared chrome across app pages | frontend |
| MOD-DRSAM-ENUMS | medium | onboarding_step_os, path_page_tab_os, settings_tab_os, … | Option sets for navigation and forms | frontend |
| MOD-DRSAM-DESIGN-SYSTEM | medium | bTIHr, bTIRW, bTIuS, bTIyi | Styles + progress/score/session reusables | frontend |
| MOD-DRSAM-DASHBOARD | medium | bTHDT | Dashboard home hub | frontend |
| MOD-DRSAM-JOURNAL | large | bTHDa | Journal and daily check-ins | frontend |
| MOD-DRSAM-PATHS | large | bTHDf, bTIyi | Guided paths and session completion | frontend |
| MOD-DRSAM-CHAT | medium | bTHDV, bTIRW | Chat page + RE-chat | frontend |
| MOD-DRSAM-CRISIS | small | bTIdW | Crisis support reusable | frontend |
| MOD-DRSAM-SETTINGS | large | bTHDh | Settings tabs, profile, subscription | frontend |
| MOD-DRSAM-API | medium | bTHxu, bTIAw, … (12 api_event roots) | API event mapping reference | frontend (+ adapter only if secrets required) |

## Dependency order

1. AUTH → SHELL, ENUMS
2. ENUMS → DESIGN-SYSTEM
3. SHELL + DESIGN-SYSTEM → DASHBOARD, JOURNAL, PATHS, CHAT
4. DESIGN-SYSTEM → CRISIS → SETTINGS
5. DASHBOARD → API

## Bubble pages covered

| Page | ID | Module |
|------|-----|--------|
| reset_pw | AAL | AUTH |
| onboarding | bTGNI | AUTH |
| index | bTGYf | AUTH (entry only) |
| dashboard | bTHDT | DASHBOARD + SHELL |
| journal | bTHDa | JOURNAL + SHELL |
| paths | bTHDf | PATHS + SHELL |
| chat | bTHDV | CHAT + SHELL |
| settings | bTHDh | SETTINGS + SHELL |
