# Guard redesign — what still needs testing on the phone

Everything below passes the automated tests (`npx jest`) and the type check, but has **not** been
looked at on a real device. Test it part by part, in this order. Login for the guard app:
Manoj Kumar, `6202923168`, OTP `989898`.

How to run it: `cd s-gate-guard-main && npx expo start --dev-client --port 8082 --clear`,
then `adb reverse tcp:8082 tcp:8082` and open
`exp+s-gate-guard://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082`.
If a screen looks old, restart Metro with `--clear` (it often misses file edits).

Tick each box as it is checked. Write what looked wrong next to it.

## Part 1 — Look and feel (Home, scanner, result)

- [ ] Home shows the gold **Scan QR** card and dark **New visitor** card with gradients, rounded corners and shadows (no flat/unstyled buttons)
- [ ] Home entrance animation is smooth (cards rise in one after another), no flicker
- [ ] Pressing any big card makes it shrink slightly, then spring back
- [ ] Green pulsing dot next to "On duty" is visible and not distracting
- [ ] **Inside now** and **Waiting** tiles show numbers; Waiting turns amber with a red pulsing dot when someone is waiting
- [ ] Language switch (हिंदी / English) in the top bar changes every word on Home; choice is still there after closing and reopening the app
- [ ] Hindi text is not clipped (tall letters, matras) on Home, scanner and result screens
- [ ] Emergency button: short tap only shows the "press and hold" hint; holding ~2 s fills the button then opens the emergency screen; letting go early cancels
- [ ] Android back button on Home does not crash or loop

## Part 2 — Scanner and result screens

- [ ] Camera opens straight away; gold scan line sweeps up and down inside the rounded corners
- [ ] Hint pill and the white "QR नहीं है? कोड लिखें" button are readable over the camera in bright light
- [ ] Back arrow (glass circle) leaves the scanner
- [ ] **Valid guest pass QR** → full-screen green "अंदर जाने दें" with name, flat and type in the white card; badge pops in, rings fade in
- [ ] **Used / expired / revoked pass** → full-screen red "रोकें" with the server reason in the pill; phone buzzes three times
- [ ] **Pre-approval QR** → green "पास सही है"; one tap on "अंदर जाने दें" records it; scanning again shows red "Pass already used"
- [ ] **Two valid pre-approvals** for the same QR show the pick list; tapping one records that pass
- [ ] **Staff QR** → green "अंदर आया" (check-in), scanning again → "बाहर गया" (check-out)
- [ ] Result screen countdown bar drains and the app returns to Home after 8 seconds; "अगला स्कैन" returns to the camera; "होम" goes Home
- [ ] Android back on a result goes back to the camera (not out of the app)
- [ ] Double-tapping "अंदर जाने दें" records only **one** entry (check Inside now / DB)
- [ ] Camera permission denied → friendly screen; "कैमरा चालू करें" works (or opens Settings after two refusals)

## Part 3 — Type the code (big keys)

- [ ] "कोड लिखें" opens the sheet with the gold-bordered code box and the 6×6 key grid (digits first, then A–Z)
- [ ] Every key is easy to hit with a thumb (about 58 px tall); no key overlaps the phone's gesture bar
- [ ] A 6-character guest code gives the green/red verdict like a scan
- [ ] A 12-character staff code (shown under the staff QR) checks staff in/out
- [ ] Delete removes one character; long-press on delete clears all
- [ ] "जाँचें" stays disabled below 6 characters; close (X) and Android back close the sheet without sending anything
- [ ] The system keyboard never appears

## Part 4 — New visitor (Phase 2)

- [ ] Step 1: six big tiles (Guest, Delivery, Cab, Daily help, Service, Other); tapping one moves on by itself
- [ ] Delivery → company grid (Swiggy, Zomato, …, Other); tapping a company moves on
- [ ] Step dots at the top move 1 → 2 → 3; back circle goes one step back, Android back does the same, and from step 1 leaves the screen
- [ ] Step 2: pressing digits/letters shows the flat number in the big box and live result tiles (flat + resident name) appear within about half a second
- [ ] Tapping a result tile moves to step 3; "Recent" chips show last-used flats on the next visitor
- [ ] "No flats found" shows for a flat that doesn't exist
- [ ] **Cab with a pre-approval** for that flat → green "Valid pass" → "Allow entry" records it **without** bothering the resident; the visitor appears under Inside now
- [ ] Cab / delivery / daily help **without** a pre-approval → goes on to step 3 quietly
- [ ] "निवासी से पूछें" on a pass screen goes on to step 3
- [ ] Step 3: summary card shows the right icon, type (and company) and flat
- [ ] "फोटो लें" opens the camera; shutter, retake, "यही फोटो लें" work; photo shows with Retake/Remove
- [ ] "नाम जोड़ें" opens a name box; the keyboard doesn't cover it
- [ ] "निवासी को बताएँ" sends once (double tap = one request) and opens the waiting screen; the resident's phone (main app) gets the request with name/photo
- [ ] Failure (airplane mode) shows the alert and stays on step 3

## Part 5 — Still old-looking (will be done in Phases 3 and 4, then added here)

- [ ] Waiting screen, Waiting list (Approvals), Who-is-inside list
- [ ] Emergency screen, Profile, Login

## Known limits (not bugs)

- Server messages such as "Pass expired" stay in English; only the app's own text is Hindi.
- The scanner can't check out a guest by QR (the server only supports that for staff); use the Inside list.
