# Guard app redesign plan — "one-tap gate"

## Goal

Make the S-Gate Guard app usable by a guard with no smartphone experience after a
single 2-minute explanation. A guard must never have to decide *which* screen to use
for a person at the gate, read small English text, or type a flat number on a keyboard.

This is a **UI/flow redesign only**. Do not change backend routes, request bodies, or
response handling contracts. Every API call the app makes today must keep working.

## Who the user is

- Security guard at an Indian housing society gate, often 40+, Hindi first language,
  limited reading in English, uses WhatsApp/YouTube but not complex apps.
- Works standing up, in sunlight or at night, often with a crowd at the gate and a
  cab honking. One hand busy. Needs answers in under 3 seconds.
- Will be taught once by the society admin: "Press the big yellow button and point it
  at the QR. Green = let in. Red = stop. No QR = press 'New visitor'."

## Problems with the current app (verified on device, 13 Oct 2026)

1. **Too many choices on home.** `src/app/index.tsx` shows 8 options: New entry,
   Scan pass, Pre-approved passes, Today's entries, Approvals, Staff check-in,
   My profile, Emergency. A guard has to know the difference between "Scan pass",
   "Pre-approved passes" and "Staff check-in" — all of which mean "a person showed me
   something".
2. **Three separate verification flows** for the same real-world event:
   `scan-verify.tsx` (QR), `pre-approved.tsx` (type + flat/vehicle digits),
   `staff-scan.tsx` (staff QR / code). `scan-verify.tsx` *already* recognises visitor
   QRs, pre-approval QRs and staff QRs (`isPreApprovedQr`, `DOMESTIC_STAFF` branch) —
   the other two entry points are redundant for the QR case.
3. **Small, low-contrast English text.** Labels at 10–12px (`eyebrow`, `quickText`,
   `sectionLabel`), grey on beige, letter-spaced caps ("SECURITY DESK",
   "QUICK ACCESS"). Hard to read in sunlight; meaningless to a Hindi reader.
4. **Flat selection needs typing** ("Search flat — A-101, B-204…") in
   `new-entry.tsx` and `pre-approved.tsx`. Guards don't know the format and the
   keyboard covers the screen.
5. **Results are a card with rows** (Name / Flat / Type / Role / Status / Mode) in
   `scan-verify.tsx` `ResultCard`. The guard has to read to know whether to open the
   gate. The decision should be a full-screen colour.
6. **Approvals vs Waiting vs Today's entries** are three screens for "who is at the gate
   / who is inside". Check-out is buried in Today's entries.

## Design principles (apply to every screen)

- **One decision per screen.** Each screen asks exactly one question or shows exactly
  one answer.
- **Colour = meaning, everywhere:** green = allow / inside, red = stop / deny,
  yellow = waiting / needs action, grey = done. Never use these colours decoratively.
- **Big:** primary buttons ≥ 72dp tall, full width; body text ≥ 18sp; result titles
  ≥ 40sp; touch targets ≥ 56dp; no text below 15sp anywhere.
- **Icon + word** on every button; never text-only, never icon-only.
- **Bilingual, Hindi first.** Every user-visible string goes through a translation
  helper (see Phase 0). Default language Hindi, switchable to English from Profile and on
  the login screen. Keep translations short (2–4 words for buttons).
- **No typing when a tap will do.** Typing is the fallback, never the default.
- **Feedback without reading:** distinct haptic patterns for allow (one long) and deny
  (three short); keep existing `expo-haptics`. (Sound is optional: only add `expo-audio`
  if it installs cleanly with SDK 54 — otherwise skip, don't block on it.)
- **Always a way back to Home:** every screen has a large "Home / होम" button at the
  bottom in addition to the header back arrow; Android back must work everywhere and
  never leave a half-finished request.
- **Forgiving:** double-tap on any submit must send one request (keep the existing
  in-flight guards); results auto-return to Home after 8 s with a visible countdown.

## New information architecture

```
Home
├── [SCAN]  (giant, yellow)        → Scanner → Result (full-screen green/red)
│      └── "No QR? Type code"      → Code keypad → Result
├── [NEW VISITOR] (giant, dark)    → Who? (icon grid) → Which flat? (tap grid)
│                                    → Photo (optional, one tap) → Waiting → Result
├── Waiting at gate (n)  (yellow strip, only when n > 0) → list of waiting visitors
├── Inside now (n)                 → list with big "Exit" per person
└── bottom row (small): Emergency (long-press 2 s) · Profile/Language
```

Removed from Home: separate "Pre-approved passes", "Staff check-in", "Approvals",
"Today's entries" tiles. Their functions move as follows:

| Old screen | Where it goes |
|---|---|
| `staff-scan.tsx` | Folded into SCAN (staff QR already handled by `scan-verify`). Staff code typing → the "Type code" keypad. Keep the route file but redirect to `/scan-verify` so old links work. |
| `pre-approved.tsx` QR path | Folded into SCAN (already supported). |
| `pre-approved.tsx` no-QR path (cab/delivery by flat or vehicle digits) | Becomes the first step of NEW VISITOR: after choosing "Cab"/"Delivery"/"Help", the app checks for a matching pre-approval for the chosen flat (same API the screen uses today) and, if found, shows the green Allow result directly instead of asking the resident. |
| `approvals.tsx` | "Waiting at gate" list on Home. |
| `today-entries.tsx` | "Inside now" list (default filter = inside, with a small "All today" toggle). |
| `entry-waiting.tsx` | Keep, restyle (Phase 3). |
| `emergencies.tsx` | Keep, reached by long-press on the Emergency button. |

## Phases

Each phase must leave the app fully working. Run `npx tsc --noEmit` and `npm test`
after each phase; both must pass (update tests that assert old copy/structure).

### Phase 0 — foundations (no visible redesign yet)

1. **Strings / i18n.** Add `src/i18n/` with `hi.ts` and `en.ts` (plain objects, same
   keys) and a `useT()` hook reading the language from a small zustand store persisted in
   SecureStore (`guard_language`, default `'hi'`). No new dependency needed.
   Move every user-visible string in the screens you touch into it. Hindi copy must be
   simple spoken Hindi (e.g. "अंदर जाने दें", "रोकें", "नया विज़िटर", "QR स्कैन करें"),
   not formal/Sanskritised Hindi. Keep "QR", "OTP", flat numbers in Latin script.
2. **Design tokens.** In `src/constants/theme.ts` add semantic tokens:
   `allow` (green), `deny` (red), `wait` (amber), `neutral`, plus a type scale
   (`body 18`, `button 20`, `title 28`, `result 44`) and `touch.min = 56`,
   `button.height = 72`. Ensure WCAG AA contrast on the cream background.
3. **Shared components** in `src/components/gate/`:
   - `GiantButton` (icon + label + optional sub-label, 72–120dp, full width, haptic).
   - `ResultScreen` (full-screen colour, huge icon, 1-line verdict, 1-line reason,
     person name + flat in large text, primary action, auto-return countdown).
   - `HomeButton` (sticky bottom "Home").
   - `FlatPicker` (see Phase 2).
4. Language switch on the login screen (top-right "हिंदी / English") and in Profile.

### Phase 1 — Home + unified SCAN

1. Rebuild `src/app/index.tsx` to the IA above: greeting reduced to one line
   ("नमस्ते, Manoj · Main Gate"), then:
   - **SCAN** giant yellow button (≈ 40% of screen height) → `/scan-verify`.
   - **NEW VISITOR** giant dark button → `/new-entry`.
   - **Waiting at gate (n)** yellow strip, only if n > 0 (reuse the existing
     `GET /api/v1/gate/entry-requests?status=PENDING` poll) → waiting list.
   - **Inside now (n)** neutral strip → inside list.
   - Bottom row: Emergency (long-press 2 s with a filling ring; short tap shows
     "दबाकर रखें / Press and hold"), Profile.
2. `scan-verify.tsx`:
   - Camera opens immediately, full screen, big frame, one instruction line
     ("QR को डिब्बे में रखें").
   - Large "No QR? Type code" button at the bottom → numeric/alphanumeric keypad screen
     with big keys (no system keyboard), 6-char boxes, auto-submit on 6th char.
   - Replace `ResultCard` and `PreApprovedSheet` result UI with `ResultScreen`:
     - Allowed → green, "अंदर जाने दें / Let in", name, flat, type icon.
       For pre-approvals keep the existing explicit "Allow entry" confirmation tap
       (it marks the pass used) but make it the single giant button.
     - Denied → red, "रोकें / Stop", reason from the server message (already specific:
       expired / used / revoked / wrong gate) shown as one short line.
     - Staff → green with staff photo/name/type, and "Check in" or "Check out" decided by
       the server response (same calls as today).
   - Scanning the same person's QR again while they are inside offers **Exit** (if the
     backend already supports checkout for that pass type — verify in `today-entries.tsx`
     which call it uses; do not invent endpoints).
3. `staff-scan.tsx` → redirect to `/scan-verify` (keep file so deep links/tests resolve).

### Phase 2 — NEW VISITOR without typing

Rebuild `new-entry.tsx` as 3 short steps with a step dots indicator and big Back/Next:

1. **Who is it?** 2×3 grid of giant icon tiles: Guest, Delivery, Cab, Daily help,
   Service/Repair, Other. Delivery → second grid of company logos/names already in the
   screen (keep the existing provider list and `providerTag` values).
2. **Which flat?** `FlatPicker`:
   - Row of big tower/block chips (from the same flats search/list API the screen uses
     today; if only a search endpoint exists, load once with the society's flat list via
     the existing call and group client-side — do not add backend routes).
   - Then a grid of flat-number buttons for that block, grouped by floor.
   - "Recent" chips (keep the existing recent-flats logic) at the top.
   - A small "Type instead" link keeps the current search for edge cases.
   - For Cab/Delivery/Help: after a flat is chosen, check for a matching pre-approval
     (reuse `pre-approved.tsx`'s API call). If one matches → go straight to green
     `ResultScreen` with "Allow entry". Otherwise continue.
3. **Photo (optional)** — one giant "Take photo" button and a giant "Skip" button.
   Name field stays optional and is collapsed behind "Add name".
   Submit → existing create-entry call → `entry-waiting`.

Keep all current payload fields and the existing validation; only the UI changes.

### Phase 3 — Waiting, Waiting list, Inside list

1. `entry-waiting.tsx`: full-screen amber "Waiting for resident…" with a large pulsing
   icon and elapsed timer. When the resident answers, switch to `ResultScreen`
   (green/red). After 60 s show two giant buttons "Let in anyway" / "Send away"
   (today's "Allow Anyway" / "Turn Away" — same calls). Keep the "Next visitor" button.
2. Waiting list (replaces `approvals.tsx` content, route can stay `/approvals`): one big
   card per visitor (photo, name, flat, minutes waiting), two giant buttons
   Allow / Stop. Same approve/reject calls.
3. Inside list (`today-entries.tsx` restyled): default shows only people currently
   inside, each with a big red-outline "Exit / बाहर" button (existing checkout call).
   Toggle chip "All today". Remove the 5 filter chips from the default view (keep them
   under "All today").

### Phase 4 — Emergency, Profile, Login polish

1. Emergency: long-press entry from Home; the emergency screen shows 4 giant tiles
   (Fire, Medical, Theft/Fight, Other) with icons; one more confirm press; success
   screen in red with "Help is coming / मदद आ रही है". Keep the existing cooldown logic.
2. Profile: language switch, gate name, shift, Logout (with confirm). Nothing else.
3. Login (`auth.tsx`): bilingual, bigger number field (number pad, 10 digits shown in
   2 groups), OTP as 6 big boxes with auto-read if already supported, clear error text
   ("यह नंबर गार्ड के रूप में रजिस्टर नहीं है" for the server's guard-only 403).

### Phase 5 — QA on a real device

Test on the Pixel (phone) and the emulator with the guard account (Manoj Kumar,
6202923168, OTP 989898). Record each flow with `adb screenrecord` and check frames for
flicker and dark "ghost" frames on back navigation (the main app had this; see repo root
notes). Acceptance tests — each must be doable by tapping only, with the language set to
Hindi:

- [ ] Valid guest QR → green Let in in ≤ 2 taps from Home.
- [ ] Used / expired / revoked QR → red with the specific reason.
- [ ] Pre-approval QR → green, one "Allow entry" tap marks it used; scanning again → red "already used".
- [ ] Staff QR → check in; scan again → check out.
- [ ] Typed 6-char code via the keypad → same results as scanning.
- [ ] New guest for a flat without typing → resident approves on the main app → guard sees green.
- [ ] Delivery for a flat with a matching pre-approval → straight to green, no resident call.
- [ ] Resident doesn't answer → after 60 s, "Let in anyway" works.
- [ ] Waiting list Allow / Stop; Inside list Exit.
- [ ] Emergency needs a 2 s press; a short tap only shows the hint.
- [ ] Android back on every screen returns sensibly, never double-submits; double-tapping any submit sends one request.
- [ ] Switching to English changes every visible string; no untranslated keys appear.
- [ ] No text under 15sp; all primary buttons ≥ 72dp (check with uiautomator bounds).

## Constraints for the implementer

- Work only in `s-gate-guard-main/`. Do not edit the backend or the other two apps.
- The guard API instance does **not** include `/api/v1` in its baseURL — keep the
  per-call prefix (see root `CLAUDE.md`).
- Reuse existing service calls and response parsing; copy them, don't rewrite them.
  The array-vs-object payload handling (`payload?.entryRequests ?? payload?.entries`)
  exists because of past bugs — keep it.
- Never run `git stash`, `git reset --hard` or `git checkout -- .` on the shared tree.
- Commit per phase with a clear message; don't push without the user's go-ahead.
- If something in this plan conflicts with how the backend actually behaves, follow the
  backend and note the deviation in the phase's commit message.
