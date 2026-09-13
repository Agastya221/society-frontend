# S‑Gate (s-gate-master) — Manual UI/UX Test Checklist

Every screen, sub‑screen, modal and role‑gated view in the app, in the order you'd naturally reach it.
Tick each row after checking: layout, spacing, fonts, colors, dark/keyboard behavior, empty state, loading skeleton, error state, back button, and that every button/link actually navigates.

Route groups: `(onboarding)` = resident KYC flow · `(resident)` · `(admin)` · `(superadmin)`.
`MODAL:` = opens a bottom sheet, not a route.

---

## 0. Pre‑auth (no login) — everyone

| # | Screen | Route | Notes / sub‑states |
|---|--------|-------|--------------------|
| 0.1 | Onboarding carousel (first launch only) | `/onboarding` | 3 slides: "Secure Every Entry Point" → "One‑Tap Approvals" → "Your Society, Smarter". Test swipe, dots, **Skip**, **Continue**, **Get Started**. Only shows once (SecureStore flag). |
| 0.2 | Login — phone step | `/login` | `+91` prefix, 10‑digit input, validation, **Send OTP**, keyboard avoidance. |
| 0.3 | Login — OTP step | `/login` | 6‑digit OTP, resend countdown timer, error on wrong OTP, back to phone step, auto‑submit on 6 digits. |
| 0.4 | Post‑login routing | — | RESIDENT → `(onboarding)` if KYC pending, else `(resident)/home` · ADMIN → `(admin)` · SUPER_ADMIN → `(superadmin)`. |
| 0.5 | Splash / AppLoader | — | Shown while fonts + token load. No flash of wrong screen. |

---

## 1. Resident onboarding / KYC flow — role RESIDENT, `requiresOnboarding = true`

Reached automatically after login when the resident has no approved flat. Stack, swipe‑back enabled.

| # | Screen | Route | Notes / sub‑states |
|---|--------|-------|--------------------|
| 1.1 | Onboarding intro | `/(onboarding)` | Entry / welcome. |
| 1.2 | Resident type | `/(onboarding)/resident-type` | **OWNER** vs **TENANT** selection. |
| 1.3 | Select city | `/(onboarding)/select-city` | Search list, "No cities found" empty state. |
| 1.4 | Society search | `/(onboarding)/society-search` | Search, "No societies found" empty state. |
| 1.5 | Select block | `/(onboarding)/select-block` | "No blocks found" empty state. |
| 1.6 | Select flat | `/(onboarding)/select-flat` | Status chips: **Available / Has Owner / Occupied**. |
| 1.7 | Add flat status | `/(onboarding)/add-flat-status` | "Request Under Review", "Flat Request", **Back to My Flats**. |
| 1.8 | Document upload | `/(onboarding)/document-upload` | File/image picker, upload progress, remove file, per‑file errors. |
| 1.9 | Review & submit | `/(onboarding)/review-submit` | "Application Summary", "Uploaded Documents" / "No documents uploaded". |
| 1.10 | Approval status | `/(onboarding)/approval-status` | States: **Complete Your Application**, **Resubmit Documents**, **Continue**, **Start Over**, **Sign out**. |

---

## 2. Role: RESIDENT — main app `(resident)`

Bottom tab bar: **Home · Notice · Delivery · Society · Profile**. Emergency overlay + floating SOS can appear over any screen.

### 2A. Tab bar screens

| # | Screen | Route | Sub‑states to check |
|---|--------|-------|---------------------|
| 2A.1 | Home | `/(resident)/home` | Hero card (smooth / gate approval / payment pending), Quick Actions grid (max 7 + "More Tools"), activity feed + "No activity yet today", waiting‑gate approve/deny card, pull‑to‑refresh, floating SOS. |
| 2A.2 | Notices (tab) | `/(resident)/notices` | List, empty state, open a notice. |
| 2A.3 | Delivery (tab) | `/(resident)/deliveries` | Sub‑tabs: **At Gate / Expected / Collected**. Each: list, empty state, item detail. |
| 2A.4 | Society (tab) | `/(resident)/society` | Sub‑tabs: **Visitors / Notices / Residents**. Visitors: date group headers, Inside/Left pills, "Search Vehicle" CTA. Residents: block filter chips (All / Block X), Owner/Tenant/Family tags. Notices: filter chips. Search box per tab. |
| 2A.5 | Profile | `/(resident)/profile` | Header + avatar, profile completion meter, address card, household grid, **Manage My Flats** sheet, **Add Flat/Villa/Office**, QR modal, edit account modal, all Setting rows below. |

### 2B. Profile → Setting rows (Resident)

| # | Row | Target |
|---|-----|--------|
| 2B.1 | Notification Preferences | `/(resident)/notifications` |
| 2B.2 | Visitor List | `/(resident)/visitors` |
| 2B.3 | Security Alert List | `/(resident)/emergency` |
| 2B.4 | Manage My Flats | context sheet (switch active flat) |
| 2B.5 | Add Flat/Villa/Office | onboarding `select-city` |
| 2B.6 | Account Information | edit modal (name, save) |
| 2B.7 | Support & Feedback | mail to support@sgate.app |
| 2B.8 | Tell a friend about S‑Gate | native share sheet |
| 2B.9 | Terms / Privacy | external browser |
| 2B.10 | Logout | confirm dialog → back to `/login` |

### 2C. Essentials tools (Home quick actions + All Tools)

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 2C.1 | Pre‑Approve visitor | `MODAL:preapprove` (PreApproveSheet) | Form: name, phone, date/time, purpose; validation; submit; success. |
| 2C.2 | Expect Delivery | `MODAL:preapprove_delivery` | Same sheet, delivery variant. |
| 2C.3 | My Passes | `/(resident)/my-passes` | Sub‑tabs: **Pre‑Approvals / Invites**. Empty states, pass card, QR, cancel pass. |
| 2C.4 | SOS Alerts (list) | `/(resident)/emergency` | List of alerts, empty state. |
| 2C.5 | SOS create | `/(resident)/emergency/create` | Category pick, confirm, send. |
| 2C.6 | SOS sent confirmation | `/(resident)/emergency/sent` | Success screen. |
| 2C.7 | SOS detail | `/(resident)/emergency/[id]` | Live status, responders, dismiss. |
| 2C.8 | All Tools (resident) | `/(resident)/all-tools` | Sections: **Essentials / Society & Community / Personal**. Every tile taps through. |

### 2D. Society & Community tools

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 2D.1 | Community feed | `/(resident)/communication` | List, empty state. |
| 2D.2 | Community post detail | `/(resident)/communication/[id]` | Comments, like. |
| 2D.3 | Create community post | `/(resident)/communication/create` | Text/image, validation, submit. |
| 2D.4 | Local Directory | `/(resident)/local-directory` | Category grid (Plumber, Electrician, Carpenter, Painter, Cleaner, Gardener, Pest control, Security, Medical…), "No categories" empty. |
| 2D.5 | Directory category list | `/(resident)/local-directory/[category]` | Contacts list, empty state. |
| 2D.6 | Directory contact detail | `/(resident)/local-directory/contact/[id]` | Call / details. |
| 2D.7 | Daily Help | `/(resident)/daily-help` | Type list (Maid, Cook, Driver, Milkman, Paperboy, Car Cleaner, Nanny, Tuition Teacher, Skating Instructor, Elderly Caretaker, Laundry). |
| 2D.8 | Daily Help by type | `/(resident)/daily-help/[type]` | Helper list, Inside/OpenToWork/rating, empty state. |
| 2D.9 | Daily Help profile | `/(resident)/daily-help/profile/[id]` | Helper detail, houses served, rating. |
| 2D.10 | Amenities | `/(resident)/amenities` | List of amenities. |
| 2D.11 | Amenity detail | `/(resident)/amenities/[id]` | Info, availability, **Book**. |
| 2D.12 | Book amenity | `/(resident)/amenities/book/[id]` | Slot/date picker, confirm. |
| 2D.13 | My bookings | `/(resident)/amenities/my-bookings` | Sub‑tabs: **UPCOMING / PAST**. Cancel booking. |
| 2D.14 | Polls / Elections | `/(resident)/elections` | Sub‑tabs: **ACTIVE / COMPLETED**. Empty states. |
| 2D.15 | Poll detail | `/(resident)/elections/[id]` | Vote, results, already‑voted state. |
| 2D.16 | Documents | `/(resident)/documents` | List, empty state. |
| 2D.17 | Document detail | `/(resident)/documents/[id]` | Viewer / download. |
| 2D.18 | Notices (full) | `/(resident)/notices` | Same as tab; deep list. |

### 2E. Personal tools

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 2E.1 | Society Dues | `/(resident)/society-dues` | List of dues, paid/unpaid, totals. |
| 2E.2 | Due detail / pay | `/(resident)/society-dues/[id]` | Breakdown, pay flow. |
| 2E.3 | My Vehicles | `/(resident)/vehicles` | List, empty state. |
| 2E.4 | Add vehicle | `/(resident)/vehicles/add` | Reg number, type, keyboard, validation, save. |
| 2E.5 | Search Vehicle | `/(resident)/search-vehicle` | Search input, results, not‑found. |
| 2E.6 | Complaints | `/(resident)/complaints` | Filter chips: **ALL / (statuses)**. Empty state. |
| 2E.7 | Create complaint | `/(resident)/complaints/create` | Category, description, photo, submit. |
| 2E.8 | Complaint detail | `/(resident)/complaints/[id]` | Status timeline, comments, close/reopen. |
| 2E.9 | Approvals inbox | `/(resident)/approvals` | Pending gate requests, approve/deny (also opened by push). |
| 2E.10 | Pre‑approvals list | `/(resident)/pre-approvals` | Upcoming pre‑approved visitors. |
| 2E.11 | Family | `/(resident)/family` | Family members list, add/remove. |
| 2E.12 | Household | `/(resident)/household` | Household + daily staff overview. |
| 2E.13 | Staff | `/(resident)/staff` | Resident's tagged staff. |
| 2E.14 | Visitors | `/(resident)/visitors` | Visitor history log. |
| 2E.15 | Expect Delivery (screen) | `/(resident)/expect-delivery` | Non‑modal variant if reached directly. |
| 2E.16 | Notifications | `/(resident)/notifications` | List, read/unread, tap → deep link. |

---

## 3. Role: ADMIN — main app `(admin)`

Bottom tab bar: **Home · Passes · Alerts · Profile**. Admin can also switch to **Resident View** (RoleSwitcher on Home) — retest section 2 in that mode.

### 3A. Tab bar screens

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 3A.1 | Admin Home / dashboard | `/(admin)` | Hero ("Action Required" / "running smoothly"), action summary (Onboarding Requests etc.), quick actions, waiting‑gate approve/deny, **Resident View** switch, pull‑to‑refresh. |
| 3A.2 | Gate Passes | `/(admin)/gate-passes` | Filter tabs incl. **ALL**; list; pass detail; create. |
| 3A.3 | Broadcast / Alerts | `/(admin)/broadcast` | Compose broadcast, audience pick, send, history. |
| 3A.4 | Admin Profile | `/(admin)/profile` | Header, context sheet, setting rows below. |

### 3B. Admin Profile → Setting rows

| # | Row | Target |
|---|-----|--------|
| 3B.1 | Society Settings | `/(admin)/settings` |
| 3B.2 | Manage Residents | `/(admin)/onboarding-requests` |
| 3B.3 | Guard Management | `/(admin)/guards` |
| 3B.4 | Gate Passes | `/(admin)/gate-passes` |
| 3B.5 | Notification Preferences | `/(admin)/notifications` |
| 3B.6 | Visitor Log | `/(admin)/approval-requests` |
| 3B.7 | Parking & Vehicles | `/(admin)/vehicles` |
| 3B.8 | Security Alert List | `/(admin)/emergencies` |
| 3B.9 | Manage Society Flats | context sheet |
| 3B.10 | Add Flat/Villa/Office | onboarding flow |
| 3B.11 | Support / Tell a friend / Logout | mail · share · confirm→login |

### 3C. Administration tools (All Tools → ADMINISTRATION)

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 3C.1 | All Tools (admin) | `/(admin)/all-tools` | Sections: **ADMINISTRATION / MY PERSONAL FLAT**. |
| 3C.2 | Staff | `/(admin)/staff` | Society staff list, add, detail. |
| 3C.3 | Broadcast | `/(admin)/broadcast` | (same as tab) |
| 3C.4 | Complaints (list) | `/(admin)/complaints` | Status filter, list, empty state. |
| 3C.5 | Complaint detail | `/(admin)/complaints/[id]` | Assign, status change, comments, resolve. |
| 3C.6 | Guards (list) | `/(admin)/guards` | List, add guard, empty state. |
| 3C.7 | Guard detail | `/(admin)/guards/[id]` | Shift, gate assignment, deactivate. |
| 3C.8 | Residents | `/(admin)/residents` | All residents list, search. |
| 3C.9 | Onboarding Requests | `/(admin)/onboarding-requests` | Status tabs: **PENDING_APPROVAL / APPROVED / REJECTED / …**; pending count badge; approve/reject. |
| 3C.10 | Emergencies | `/(admin)/emergencies` | Active/past SOS, respond. |
| 3C.11 | Community (moderation) | `/(admin)/community` | Posts feed, moderate. |
| 3C.12 | Polls / Elections | `/(admin)/elections` | Create poll, active/closed, results. |
| 3C.13 | Notices | `/(admin)/notices` | Create notice, list, edit/delete. |
| 3C.14 | Payments | `/(admin)/payments` | Collections, dues overview, filters. |
| 3C.15 | Flats (list) | `/(admin)/flats` | All flats, occupancy, search. |
| 3C.16 | Flat detail | `/(admin)/flats/[id]` | Residents in flat, dues, vehicles. |
| 3C.17 | Vehicles | `/(admin)/vehicles` | Society‑wide vehicle registry, search. |
| 3C.18 | Gate Points | `/(admin)/gate-points` | Gates list, add/edit. |
| 3C.19 | Settings | `/(admin)/settings` | Society config fields, save. |
| 3C.20 | Approval Requests (list) | `/(admin)/approval-requests` | Filter: **ALL / PENDING / APPROVED / REJECTED / EXPIRED**; empty state per filter. |
| 3C.21 | Approval Request detail | `/(admin)/approval-requests/[id]` | Approve / reject, visitor info. |
| 3C.22 | Create approval request | `/(admin)/approval-requests/create` | Form, submit. |
| 3C.23 | Create gate pass | `/(admin)/gate-pass/create` | Form, submit. |
| 3C.24 | Broadcast/SOS create | `/(admin)/sos-create` | Admin‑raised alert. |
| 3C.25 | Notifications | `/(admin)/notifications` | List, deep links. |

### 3D. Admin's own flat (All Tools → MY PERSONAL FLAT)

| # | Screen | Route |
|---|--------|-------|
| 3D.1 | Pre‑Approve (admin) | `MODAL:preapprove` |
| 3D.2 | Expect Delivery (admin) | `MODAL:preapprove_delivery` |
| 3D.3 | My Passes | `/(admin)/my-passes` |
| 3D.4 | My Dues | `/(admin)/my-dues` |
| 3D.5 | My Home | `/(admin)/my-home` |
| 3D.6 | My Vehicles (shared w/ resident) | `/(resident)/vehicles` |
| 3D.7 | My Amenities (shared) | `/(resident)/amenities` |

---

## 4. Role: SUPER_ADMIN — `(superadmin)`

Plain stack, no tab bar.

| # | Screen | Route | Sub‑states |
|---|--------|-------|-----------|
| 4.1 | Super Admin dashboard | `/(superadmin)` | Counts: **PENDING / APPROVED / REJECTED**; pending requests preview; logout. |
| 4.2 | Registration requests list | `/(superadmin)/requests` | Full list, empty state ("No pending requests right now."). |
| 4.3 | Request detail | `/(superadmin)/requests/[id]` | Society info, contact, flats count; **Approve** confirm; **Reject** with reason modal. |

---

## 5. Cross‑cutting overlays & flows (test in every role where applicable)

| # | Thing | Where | Check |
|---|-------|-------|-------|
| 5.1 | Emergency overlay | any `(resident)` screen | Full‑screen alert + siren sound + vibration when an SOS is active; **Dismiss**; pauses in background. |
| 5.2 | Floating SOS button | resident Home | Always visible, opens SOS create. |
| 5.3 | Mandatory permission prompts | after login (RESIDENT/ADMIN) | Notification permission dialog → Location permission dialog → "Open Settings" fallback when denied; re‑prompt on return from Settings. |
| 5.4 | Push deep links | notification tap | `GATE_REQUEST` → resident `/(resident)/approvals` or admin `/(admin)/approval-requests`; `ONBOARDING_STATUS` → admin `/(admin)/onboarding-requests`. |
| 5.5 | Foreground notification banner | any screen | In‑app banner shows, sound, badge. |
| 5.6 | Context / flat switcher sheet | Profile (resident & admin) | Switch active flat → app re‑routes to that context's home. |
| 5.7 | Role switcher | admin Home | Admin View ⇄ Resident View; resident‑side screens all reachable as admin. |
| 5.8 | Auth expiry | any screen | 401 → forced back to `/login` cleanly. |
| 5.9 | Global AppAlert / AppLoader | everywhere | Alert dialogs styled consistently; loader not stuck. |
| 5.10 | Back behavior | stacks & tabs | Hardware/gesture back never leaves a blank screen; tabs use history back. |

---

### Per‑screen checklist (apply to every row above)

- [ ] Safe‑area padding top & bottom (notch, gesture bar)
- [ ] Header title + back button present and working
- [ ] Loading skeleton / spinner shows, then resolves
- [ ] Empty state copy + illustration
- [ ] Error state + retry
- [ ] Pull‑to‑refresh (list screens)
- [ ] Keyboard: fields not covered, `KeyboardAvoidingView`, dismiss on tap‑out
- [ ] Long text / long names don't overflow or clip
- [ ] Buttons have pressed state + haptic where expected
- [ ] Fonts = Sora family, colors match `Sgate-theme`
- [ ] Navigation target is correct (no "screen not available yet" AppAlert)
- [ ] Sub‑tabs/filters switch content and keep scroll sane
