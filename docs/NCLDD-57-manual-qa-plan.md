# NCLDD-57 — Manual QA plan: browsers and emulators

Execution plan for the manual part of `docs/NCLDD-57-test-plan.md` (section numbers `§N.M` refer to
it). Results go to the "Manual QA log" in `docs/NCLDD-57-test-report.md`.

## 0. Preconditions

- Frontend running locally: `cd frontend && npm run dev` → `http://localhost:3000` (prod hosting
  does not have Conversation mode yet). Backend = production Supabase (`chat`, `realtime-voice`
  deployed, 4 migrations applied).
- `getUserMedia` needs a secure context: `localhost` works, a LAN IP (`http://192.168.x.x:3000`) or
  `10.0.2.2` does **not**. For emulators use port forwarding to `localhost` (see §3, §4) or an HTTPS
  tunnel.
- Accounts: Free (< 7 sessions this month), Pro, settings admin. Keep the SQL from the test plan
  open in the Supabase SQL editor.
- Real microphone and speakers/headphones. Headphones prevent Kota hearing itself (false
  interruptions); run §2.3 once without headphones too.
- OpenAI dashboard access for §8.

## 1. Environment matrix

| Env | What it is | Covers | Limits |
|---|---|---|---|
| **A. Chrome desktop** (Windows) | Real browser, real mic | Full plan: §1–§13 | — |
| **B. Edge / Firefox desktop** | Second engine (Firefox = Gecko) | Smoke: §1.1, §2.1–2.5, §4.1, §10.2 | — |
| **C. Chrome DevTools device mode** | Desktop Chrome with phone viewport / throttling | §3.4 layout, §9 offline (Network → Offline), §3.2 (Rendering → `prefers-reduced-motion`) | Not a mobile engine; no mobile audio policies |
| **D. Android Emulator** (Android Studio, Chrome) | Real Android Chrome, host mic | §1, §2, §3.4, §4, §5, §9, §10.2, §10.5 | Mic quality/latency worse than a device; enable host audio input |
| **E. iOS Simulator** (Xcode, macOS only) | Real mobile Safari/WebKit | §2.1–2.5, §3.4, §10.1–10.2, §10.8 | Needs a Mac; mic passthrough is unreliable — confirm on a real iPhone |
| **F. Real phones** (iPhone Safari, Android Chrome) | Final sign-off | §2, §9 (airplane mode), §10.8, §12.4 | — |

If no Mac is available: replace E with a real iPhone (or BrowserStack Live real device) and note it
in the log.

## 2. Env A — Chrome desktop (full run, ~2.5 h + 60 min background for §12)

Order (cheap → expensive, avoid burning the Free limit early):

1. **Pro user.** §1.1–1.4 (voice messages regression).
2. §10.1, §10.2 (deny mic: site settings → Microphone → Block), §10.6 (DevTools → Offline),
   §10.7 (second tab), §10.3 (disable mic in Windows Sound settings), §10.4 (mic held exclusively by
   another app, e.g. Audacity with exclusive mode).
3. §2.1–2.5 + §3.1 + §4.1–4.2 + §5.1–5.3 in one go: pick Cedar, start, talk 4 turns, interrupt
   twice, end. Check SQL after.
4. §4.3–4.4 history and feedback.
5. §2.6 close-tab keepalive; check SQL in 10 s and again after 5 min if not closed.
6. §10.5 revoke mic mid-session.
7. §9.1–9.3 network drop: DevTools → Network → Offline for 15 s (or unplug Wi-Fi), then Try again.
8. §11.1–11.3 key exposure (Network tab, Sources search, function logs).
9. **Admin.** §6.1–6.3 platform rule / prohibited topic / no KB; §7.1–7.3 AI Usage; §8.1–8.2
   compare 2–3 sessions with the OpenAI dashboard.
10. §13.3 crisis phrase. §13.2 voice limit $0.01 (restore afterwards).
11. **Free user.** Fill to 7 sessions (or set via SQL), §13.1.
12. §12.4 idle timeout (10 min silence), then §12.1–12.3 60-minute run in a background tab with a
    short phrase every ~5 min.

## 3. Env C — DevTools device mode (~20 min)

- Device toolbar: iPhone 12 Pro (390), Pixel 7 (412), 375 px custom. §3.4: no horizontal scroll, orb
  shrinks with transcript, footer buttons visible; dark theme (OS dark mode or `.dark`).
- Rendering panel → Emulate `prefers-reduced-motion: reduce` → §3.2.
- Network → Slow 3G: start a session, check Connecting → error/timeout message is readable.

## 4. Env D — Android Emulator (~45 min)

Setup:
1. Android Studio → Device Manager → Pixel 7, API 34 (Google Play image so Chrome updates).
2. Extended controls (⋯) → Microphone → **"Virtual microphone uses host audio input"** = on.
3. `adb reverse tcp:3000 tcp:3000`, open `http://localhost:3000` in emulator Chrome.

Run: §1.1–1.2, §2.1–2.5, §3.4, §4.1, §5.1, §10.2 (deny in the Chrome prompt), §10.5 (Android
Settings → Apps → Chrome → Permissions → Microphone → Don't allow during a session), §9.1–9.2
(Extended controls → Cellular/Wi-Fi off, or `adb shell svc wifi disable` + `svc data disable`),
§2.6 (swipe Chrome away from recents).

## 5. Env E — iOS Simulator (~45 min, Mac only)

Setup: Xcode → Simulator → iPhone 15, latest iOS. Frontend on the Mac at `localhost:3000` (the
simulator shares the host network). Allow Simulator to use the Mac microphone in macOS Privacy
settings; I/O → Audio Input → the Mac mic.

Run: §10.1 (hint may be absent — Permissions API support differs), §10.2, §2.1–2.5, §10.8 (sound
unlock button if Kota is silent), §3.4 incl. safe areas and the keyboard-free footer, §3.2
(Settings → Accessibility → Motion → Reduce Motion), §2.6 (close the Safari tab / swipe app away).
If the mic does not pass through, mark "blocked by simulator" and move these items to Env F.

## 6. Env F — real phones (~1 h, sign-off)

iPhone Safari and Android Chrome, both via an HTTPS URL (tunnel, e.g. `cloudflared tunnel --url
http://localhost:3000`, or a preview deploy):
§2.1–2.5 with the phone speaker (echo/self-interruption check), §9.1–9.3 with real airplane mode,
§10.8, lock the screen mid-session (note behaviour), §12.4 idle timeout, §4.3 history.

## 7. Exit criteria

- Env A: all sections pass (or deviations logged with a ticket).
- Env B–F: listed items pass; WebKit items (§10.8, §2.x) confirmed on a real iPhone.
- Admin proof: §7 shows every session from the run; §9.3 has no "$0.00" for a connected session.
- Report updated: "Manual" column of the DoD table + one Manual QA log row per environment.

## 8. Cleanup

- Remove the test platform rule (§6.1), restore the voice limit (§13.2) and Free session count.
- Close leftover sessions: `select id, status from "realtimeVoiceSession" where status <> 'ended'`
  for test users must return nothing after 5 min.
