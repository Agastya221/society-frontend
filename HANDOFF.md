# S-Gate frontend — UI consistency work, handoff

**Status as of 28 Sep 2026.** Everything below is in `s-gate-master/`.
Parts 1–4 are committed; Parts 5–8 and the pre-approval sheet rebuild are
**uncommitted** in the working tree.

### Codex continuation

- Found a definite QR dismissal path: three caller screens close the sheet in
  `onSuccess`, which was fired before showing the result. Completion now fires
  when the result sheet is dismissed. A live guest invite from Home returned
  `201`, displayed the QR result, and stayed open until Done.
- Removed the duplicate old sheet animation, close/back listener, delayed step
  transitions and unused step components from `PreApproveSheet.tsx`. The new
  `StepSheet` owns opening, closing, drag and Android back. Its drag gesture is
  on a 44dp handle so scrolling forms and QR cards cannot dismiss the sheet.
- The party theme, party form and party success views now use `SheetShell` with
  a fixed footer. Party success has a visible Done button.
- Product owner chose **light mode**. `app.json` is set to `"light"`; remaining
  NativeWind `dark:` classes and unused color-scheme scaffold hooks are gone.
- Verified on a connected Android phone: opening the sheet, Guest Invite,
  party theme and form, guest creation, QR result and Done. The test invite was
  revoked and deleted afterward (`200` for each). This also uncovered and fixed
  a separate frontend API mismatch: guest invite revoke must use `PATCH`, not
  `DELETE`. The My Passes UI now tells users to revoke active invites before
  deleting them. The QR now has a solid white quiet zone so the illustrated
  background cannot show through its modules. TypeScript passes; focused lint
  has 0 errors. Tests: 53 pass, 4 pre-existing login failures. A focused
  multi-pass carousel test confirms Done is the only completion trigger.

### Device QA pass + fixes (29 Sep 2026, Pixel 6a, screen-recorded at ~60fps)

Confirmed: QR carousel shows and stays open until Done; revoke is `PATCH`;
Manage Guests footer stays visible with 7–8 guests; party success works live.
"Back navigation verified" only held for the on-screen arrow.

Fixed and re-verified on device:
- Start time was stale (set at first mount, never reset) — passes were stored
  starting in the past. Now reset on every open; cab/delivery "once" windows
  (no time field) start at submission.
- Quick/Frequent choice ignored (tab leaked from the last visit); Private
  Invite had no private treatment. Both now follow the picker.
- Party preview/success emoji didn't match the chosen theme.
- Service → Frequently had no category field but required one.
- Party "Create Invite" had no loading/in-flight guard (double-submit).
- Android back closed the whole sheet; now steps back (closes on first step
  and on result screens).
- Keyboard covered focused fields on Android (edge-to-edge; KAV was iOS-only).
  `StepSheet` now lifts by the measured overlap and lowers its height cap —
  use `measure`, not `measureInWindow`, which is off by the status bar.
  Manage Guests' add form auto-focuses and scrolls fully into view.
- One-frame flash on open (`translateY` started at 0).

**Step transitions rebuilt (fixed, recorded before/after).** The old
`StepTransition` moved the outgoing step into a separate "leaving" slot, which
React treats as a new component — it remounted, so every change showed a blank
frame, then a reset/collapsed ghost of the old step, then a separate resize.
Now every step is a keyed sibling in one list, so the outgoing step stays
mounted where it is and just fades (130ms ease-out) while the incoming one
slides in (40ms delay). The sheet's content is bottom-anchored and the handle
is an opaque strip layered on top, so footers stay put while the height
springs. If you touch this again, record it: `adb shell screenrecord` gives
~60fps on the Pixel 6a — enough to see single-frame glitches.

**Sheet sizing rebuilt (supersedes "The height policy" and lessons #1/#3
below).** Every step now *fills* the sheet: header pinned top, footer pinned
bottom, body (`flex: 1`, scrolls) in between. `SheetShell` measures header,
body content (`onContentSizeChange`) and footer separately and reports the sum
through `SheetMeasureContext`; `StepSheet` springs to it (`fit`) or to the max
(`fill`). So a content change (tab switch) grows/shrinks the body smoothly
instead of snapping the header. Don't reintroduce "measure by hugging, switch
to fill if too tall" — it fed back into itself and made Cab → Frequently
flicker forever. Reported heights are tagged with their step key; clearing on
step change raced the new step's first report. `FormPanel` (guest/cab/
delivery/service forms) is now a `SheetShell` with the shared `StepHeader`;
tab bodies fade in from 30%.
Keyboard: the sheet follows `useAnimatedKeyboard()` per frame (lift + height
cap on the UI thread); `keyboardDidShow` fires too late on Android.
Cab: digits-only number pad (backend requires `^\d{4}$`), backspace steps
back, fixed label/helper (toggling Safe Pickup no longer resizes the form),
Safe Pickup/category/days reset on open, violet from theme tokens.
Testing gotcha: pressing R R to reload while a TextInput is focused types
"R" into it instead; and Metro's watcher can miss edits — `touch` the file.

Still open: white handle band above artwork steps, raw colours in
`QRCarousel`, Recent tab is a placeholder.

**Backend (`E:\society-gate-backend`, changed locally, not deployed):**
- 25 `clearCacheAfter` calls in 7 route files used `api:`-prefixed patterns
  that never matched the cache keys (which have no `api:` prefix), so lists
  stayed stale for up to the TTL after create/revoke/delete. Patterns now
  match (`party-invites:*`, `guest-invites:*`, `pre-approved:*`, `family:*`,
  `notices:*`, `admin:notif*`, `user:*`).
- `createGuestInviteSchema` / `createPartyInviteSchema` now reject
  `validUntil <= validFrom`, already-expired windows, and a start more than
  15 min in the past. The frontend clamps a past start to "now" so a form left
  open doesn't hit that.
Until this is deployed to Render, My Passes can still look stale.

Verified on a real device (Pixel-class, 1080×2400) against a live account.
`npx tsc --noEmit` is clean, `npx eslint` has 0 errors, and `npx jest` sits at
53 passing / 4 failing — **those 4 were already failing before this work**
(`src/__tests__/screens/login.test.tsx`, looking for an `Enter\nOTP` string that
no longer exists). Do not treat them as a regression.

---

## The governing rule

**The resident Home screen is the source of truth.** Every other screen moves
toward it, never the reverse. Nothing under `src/components/home/` should be
changed to match the rest of the app.

The original audit said the opposite — that Home was a rogue second design
system to be deleted. That was reversed by the product owner. If you read that
audit, ignore its item 1.

---

## What was done

### Part 1 — theme values (committed, `62d63e0`)
Rewrote the **values** in `src/constants/Sgate-theme.ts` to Home's, keeping the
token **names**. ~140 screens already imported `SgateColors`, so one file moved
the whole app onto Home's palette.

`bg #F5F4F0→#FCFCFB` · `gold #FFB800→#FACC15` · `border →#ECEDEF` ·
`t2 →#73798C` · radii `14/16/20/22/24 → 13/17/19/22/26` · `screenGutter 20→18`.

### Part 2 — raw colour sweep (committed)
7 worst files, **289 raw hexes → 14** (the 14 remaining are legitimate
`shadowColor: '#000'` and modal backdrops). Mappings are semantic, not
nearest-colour: "Paid" chips were amber → now green; the staff screen's 10-type
pastel map was rebuilt on Home's 6 tint families.

### Part 3 — Sora font (committed)
Root cause was not 22 stray components: **`tailwind.config.js` had no
font-family utilities**, so every NativeWind screen structurally could not use
Sora. Added `font-sora-*`, synced the `Sgate-*` colour classes, then swept 238
classes across 30 files.

`font-bold` → `font-sora-bold` matters on Android: a `fontWeight` on a custom
face synthesises a fake bold instead of loading `Sora-Bold`.

### Part 4 — screen headers (committed, `6652e1a`, `2c91b41`)
45 hand-rolled `paddingTop: insets.top` headers → 10 remaining, all deliberate
(Home, auth/onboarding flows, overlays). Deleted the forked
`ui/AppScreenLayout`; its 4 amenities callers now use `layout/AppScreenLayout`
and gain keyboard avoidance, the scroll-linked border and safe-area bottom CTA.
`ScreenHeader` restyled once to Home's recipe; added `HeaderIconButton`.

### Extra — Notices duplication (committed)
Notices existed twice (navbar tab + a tab inside My Society). Removed the My
Society copy: −194 lines, one fewer API call per screen open.

### Part 5 — status badges (uncommitted)
The audit claimed 4 competing badge components. **Three had zero usages** — so
the famous "ACTIVE renders red" bug was never live. Deleted the 2 dead
`StatusBadge` files, rebuilt `ui/StatusPill` as the real shared component,
migrated 8 screens off private maps.

The design point that matters: **`ACTIVE` is not one meaning.** Green for a valid
pass, blue for a gate pass in use, **red for an ongoing emergency**. A blind
status→colour map would recreate exactly the bug being deleted, so `StatusPill`
takes a `tone` override and the emergency screens pass it explicitly.

### Part 6 — empty states (uncommitted)
`EmptyState` moved out of `components/home/` to `components/ui/` (Home keeps
working via a one-line re-export). 40 hand-written "nothing here yet" blocks
replaced across 38 files. Icon names were translated Feather/Ionicons →
MaterialCommunityIcons and **every target verified against the real 7,448-glyph
map** rather than guessed.

**Skipped deliberately:** app-wide skeletons. `HomeSkeletons` is shaped for
Home's specific cards; generic ones for 40 screens aren't worth it.

### Part 7 — bottom sheets (uncommitted)
Audited all 47 `<Modal>`s into three buckets so three different things weren't
forced into one shape: 10 bottom sheets (migrated to
`AnimatedBottomSheetModal`), 11 centre dialogs (backdrop aligned only), 7
full-screen forms (left alone). Backdrops: 7 competing values → `rgba(0,0,0,0.48)`,
with two deliberate exceptions (`0.9` image viewer, `0.25` emergency scrim).
Added keyboard avoidance and a default gutter to the shared surface.

### Part 8 — housekeeping (uncommitted)
- Deleted 6 dead files: `constants/theme.ts`, `hooks/use-theme-color.ts`,
  `themed-text.tsx`, `themed-view.tsx`, `Button.tsx`, `Input.tsx` (traced as a
  self-contained cluster with zero external importers). Side effect: the
  dark-mode surface dropped from 12 files to 8.
- **`useScrollBottomPadding`** — derives scroll padding from the tab bar's actual
  layout. Fixed the real bug where some screens' last card sat under the bar and
  others had a dead gap. Applied to 27 scroll containers.
- `activeOpacity` → `0.8` across 79 files (`1` kept where it means "no feedback").
- `placeholderTextColor`: 20 raw stragglers → `SgateColors.t3`.
- Page gutters → `SgateLayout.screenGutter` in 121 styles across 76 files, with
  chips/badges/buttons left alone.

---

## The pre-approval sheet rebuild (uncommitted, incomplete)

The old sheet was rebuilt because of two reported bugs: **Select Guests was too
small to show many contacts**, and **Manage Guests hid its button once the list
grew**. Root cause: every step declared a fixed fraction of screen height
(`H_SELECT = SH*0.62 … H_GUEST_LIST = SH*0.92`), so a step with one guest still
took 92% of the screen, and content that outgrew its fraction was clipped.

### New architecture — `src/components/pre-approvals/sheet/`

| File | Role |
|---|---|
| `StepSheet.tsx` | The container. Height comes from the step, measured live — no constants table. Renders **inline**, not in a `<Modal>`, so the tab bar stays visible and the sheet reads as rising out of it. |
| `SheetShell.tsx` | The anatomy every step uses: **fixed header · scrolling body · fixed footer**. This is what structurally prevents the action button from being pushed off screen. |
| `StepTransition.tsx` | Cross-fade + slide between steps, in one place. |
| `useSheetStepper.ts` | Records the navigation trail, so "back" is always "where you came from" and the transition knows the direction. |
| `parts/StepHeader.tsx`, `parts/PrimaryAction.tsx` | Shared header row and footer button. |
| `steps/*.tsx` | `ChooseTypeStep`, `GuestInviteTypeStep`, `SelectGuestsStep`, `ManageGuestsStep`, `SuccessStep`. |

`PreApproveSheet.tsx` keeps all state, handlers and API payload logic **verbatim**
— only the shell was replaced. The form panels (`FormPanel`, `GuestOnce`,
`CabOnce`, party panels…) are reused as-is; they are validated business logic and
the reported bugs were layout-only.

### The height policy — read this before touching it

```ts
step === 'success' ? (inviteType === 'GUEST' ? 'fill' : 'fit')
  : ['guests','guest_list','party_theme','party_success'].includes(step) ? 'fill' : 'fit'
```

- **`fill`** — list-shaped steps (seeing more rows is the point) and full-bleed
  artwork panels laid out with `flex: 1`, which need a definite height.
- **`fit`** — pickers and forms, which hug their content.

Three separate bugs came from getting this classification wrong. Check what a
panel actually contains before changing it.

### Hard-won lessons (don't undo these)

1. **`flex: 1` collapses to 0 inside an auto-height parent.** This caused three
   distinct bugs — the sheet couldn't open at all, `fit` steps measured 0, and
   the transition layer measured 0. Hence `stretch` / `measureFill` being
   applied only for `fill`.
2. **The sheet's frame already ends at the tab bar.** Adding `tabBarHeight`
   padding produced a ~98dp dead band. Measured values on the test device:
   `window 914dp · tabBar 73dp · content 427dp · sheet 520dp`.
3. **A `fit` step that outgrows the cap falls back to `fill`** so its children
   get a bounded height and their scrollers engage instead of overflowing.
4. **Both steps must be mounted during a transition.** Fading out, then
   swapping, then sliding in leaves a blank beat that reads as a stutter.

### Verified on device, real account

Type selector · Guest Invite · Guest/Cab/Delivery/Service forms · Select Guests
(8 real contacts) · Manage Guests (**7 guests, "Create 7 Invites" fully
visible**) · Party theme · Party form · Success (Cab/Delivery/Service) · back
navigation · validation.

Real passes were created (`201`s, codes like `VF8XP7`). **~8 test passes are
sitting on account `+91 6202923165` / Tower A-A101 and may want cleaning up.**

---

## Remaining checks

### 1. Guest QR carousel — verified
Creating guest invites succeeds — 7 × `201` from `POST /gate/invites/guest`,
passcodes returned — but instead of showing `QRCarousel`, **the sheet closes
straight to Home**. No error in logcat.

Already ruled out:
- `createInvitePass` unwraps correctly (`return res.data.data`), so
  `res.passcode` is populated.
- `QRCarousel` with an empty `passes` array renders an `EmptyState`; it does not
  close.
- Home does not pass `onSuccess`, so nothing external closes it.

The early `onSuccess` dismissal was fixed for callers that pass that callback.
The old 180 ms success timer and second `BackHandler` were removed. A guest
invite created from Home displayed its QR result after a `201` response and
remained open until Done. The test invite was then revoked and deleted.

### 2. Legacy styles in `PreApproveSheet.tsx`
The unused animation and component code listed in the original handoff was
removed; focused ESLint reports no warnings for this file. Some unused keys in
the large `StyleSheet.create` object may remain because ESLint does not report
unused style keys.

### 3. Party success needs a live invite check
All three party panels now use `SheetShell`. Theme and form were inspected on
device. The success panel's fixed Done footer still needs a real creation check.

### 4. Light-mode native rebuild
The owner chose light mode and the JavaScript/config changes are complete.
Rebuild the native development client or release binary for `app.json`'s
`userInterfaceStyle` change to take effect on installed builds.

### 5. Not done from the original list
- **`hitSlop`** — 51 icon buttons across 33 files are under the 44×44 minimum
  (✕ / ✏️ / 🗑 / ⋮ in corners). The owner saw a comparison and chose gutters
  instead; this was left undone on purpose, not forgotten.
- **9 files still hand-write empty states** — `my-passes` (branded logo, not an
  icon), `AppFlashList` (own empty API), and a few with inline conditionals.
- **21 admin screens from Part 4 are unverified on device** — TS-clean and
  produced by a reviewed transform, but never opened in an admin session.

---

## How to run and verify

```bash
cd s-gate-master
npx expo start --dev-client --port 8081      # Metro
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW \
  -d "sgate://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"

npx tsc --noEmit -p .                        # must be 0 errors
npx eslint src/...                           # 0 errors (warnings are pre-existing)
npx jest                                     # 51 pass / 4 pre-existing failures
```

Notes from doing this repeatedly:
- **Test on a physical device.** An emulator needs an x86_64 build
  (`./gradlew assembleDebug -PreactNativeArchitectures=x86_64`); the committed
  APK is arm64-only and crashes instantly on an emulator. Emulator `input text`
  also truncates against the IME, making multi-field entry unreliable.
- Reload with `adb shell input keyevent 46 46` (RR), then wait ~12 s.
- Deep links into `(resident)/*` routes are swallowed by the root layout's role
  routing — navigate by tapping instead.
- Screen recording on the test device samples ~2.6 fps, too slow to capture a
  300 ms animation. To verify motion, temporarily slow the constants in
  `StepTransition.tsx`, screenshot, then restore them.

## Conventions

- New API calls go in `src/services/<domain>.ts` using the shared `api` instance.
- Prefer editing a `Shared*Screen` over duplicating a screen per role.
- Use `SgateColors` / `SgateSpacing` / `SgateRadius` / `SgateLayout` — never raw
  hex. `SgateSurfaces.card/input/sheet` over re-declaring borders and radii.
- Permissions enforcement in the root `_layout.tsx` is mandatory; don't bypass it.
