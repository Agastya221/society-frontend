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

## Part 5 — Waiting, waiting list and who is inside (Phase 3)

- [ ] After "निवासी को बताएँ", the amber **waiting screen** shows the visitor photo (or icon) with two pulsing rings, the white card (name, type pill, flat) and a time bar draining over 45 s
- [ ] When the resident taps **Allow** in the main app, the guard screen turns green "अंदर जाने दें" within about 3 seconds (name, flat, photo); **Deny** turns it red "रोकें"
- [ ] The result returns to Home by itself after 8 s; "नया विज़िटर" opens a fresh New visitor; Home button works; Android back on a result goes to Home (not back to the old form)
- [ ] After 45 s with no answer the screen turns orange "कोई जवाब नहीं आया" with **फिर भी अंदर जाने दें** / **वापस भेजें**; each works once (double tap = one request)
- [ ] The X (top left) asks "अनुरोध रद्द करें?"; "इंतज़ार करें" stays, "रद्द करें" cancels and goes Home; Android back does the same
- [ ] "अगला विज़िटर" (bottom) leaves the request running and opens a fresh New visitor; the earlier request's answer appears in the waiting list
- [ ] **Waiting list** (Home → Waiting tile): one big card per visitor with name, flat, resident, kind and "For N min"; green **अंदर जाने दें** and red **रोकें**; Stop asks to confirm; list pulls to refresh; empty state "सब ठीक है"; Home button at the bottom
- [ ] **Who is inside** (Home → Inside tile): default shows only people inside, each visitor with a red-outline **बाहर** button that records the exit and removes the card; staff show the "scan the staff QR" hint instead
- [ ] "आज के सभी" shows the whole day with the filter chips (All, Guests, Deliveries, Staff, Services, Cabs)
- [ ] The Inside number on Home matches the number of cards in the default view

## Part 6 — Emergency, profile and login (Phase 4)

- [ ] **Login** (log out first, from Profile): gradient glow background, brand mark and the हिंदी / English switch at the top; number box is large (28 px) with +91; the number pad opens; OTP box shows big spaced digits
- [ ] Login with Manoj (`6202923168`, OTP `989898`) works; a resident number (e.g. your own `6202923165`) shows "यह ऐप सिर्फ सुरक्षा गार्ड के लिए है…"; a wrong OTP shows a red message; Resend counts down 30 s then works; "नंबर बदलें" and Android back return to the number step
- [ ] Language chosen on the login screen stays after login and after restarting the app
- [ ] **Emergency** (Home, hold 2 s): header with back circle; nine big tiles (Medical, Fire, Security threat, Violence, Theft, Accident, Lift stuck, Animal threat, Other) with 20 px labels, easy to read and hit
- [ ] Tapping a tile opens the dim confirm card "अलार्म भेजें?"; Cancel and Android back close it without sending
- [ ] "अलार्म भेजें" sends **one** alert (double tap = one), then the red full-screen "मदद आ रही है" with the type and time; the resident app and admins receive the alert (test with a dummy alert only!)
- [ ] During the 15 s after an alarm all tiles are greyed with a countdown
- [ ] Alarm failure (airplane mode) shows the "call security directly" alert and no success screen
- [ ] **Profile**: gold hero card with initial, name, "सिक्योरिटी गार्ड" and the green ON DUTY chip; phone, society and last sign-in rows
- [ ] Language switch on Profile changes the whole app at once
- [ ] Log out asks first; "लॉग आउट" returns to the login screen; profile load failure shows "Try again" plus language and log out
- [ ] Home button on Profile / waiting list / inside list always leaves to Home

## Part 7 — Whole-app pass (after Parts 1-6)

- [ ] Walk one full real visit: new visitor → resident approves in the main app → green result → Inside now shows them → Exit
- [ ] Walk one pre-approved visit: resident creates a cab pass → guard scans its QR → one tap allows → resident is notified
- [ ] Walk one staff visit: staff QR check-in, scan again for check-out
- [ ] Switch to English and repeat the first walk; no Hindi or raw keys left over
- [ ] Rotate through Home, scanner and lists on a small phone: nothing is cut off, no horizontal scroll
- [ ] Back-navigation from every screen: no dark "ghost" frame during the back animation

## Known limits (not bugs)

- Server messages such as "Pass expired" stay in English; only the app's own text is Hindi.
- The scanner can't check out a guest by QR (the server only supports that for staff); use the Inside list.
- The old Pre-approved and Staff-scan screens are no longer linked from Home (the scanner and New visitor cover them). Staff-scan redirects to the scanner; pre-approved.tsx still exists but is unused.
- The waiting screen times out after 45 s (the plan said 60); this is the original behaviour.
