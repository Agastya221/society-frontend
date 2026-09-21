# S-Gate — society / gate management platform (frontend monorepo)

This folder (`society-frontend`) is a single git repo holding **three separate Expo React Native apps** for S-Gate, a MyGate-style gate & society management SaaS for Indian residential communities. They share one backend.

> Read this file first in a new session. It should be enough to work without re-exploring the tree.

## The three apps

| Folder | App | Package / bundle | Who uses it |
|---|---|---|---|
| `s-gate-master/` | **S-Gate** (main app) | `s-gate`, `com.sgate.app`, scheme `sgate` | Residents, society admins, super admins — the big one (~90% of the code) |
| `s-gate-guard-main/` | **S-Gate Guard** | `s-gate-guard`, `com.sgate.guard`, scheme `sgateguard` | Security guards at the gate (scan, new entry, approvals) |
| `s-gate-staff-main/` | **S-Gate Staff** | `s-gate-staff-main` | Domestic staff / vendors (gate pass, schedule, work requests) |

Each app is its own npm project — `npm install` and run commands **inside** its folder, never at the repo root.

## Shared stack

- Expo SDK 54 + **expo-router** (file-based routing, `typedRoutes: true`), React Native 0.81.5, React 19.1
- TypeScript strict, path alias `@/*` → `./src/*` (master & guard)
- **Zustand** for state (`src/store/*`), **Axios** for API (`src/services/api.ts`)
- **NativeWind v4** (Tailwind) in master & guard; staff app uses plain StyleSheet
- `expo-secure-store` for tokens, `expo-notifications` for push
- Master additionally: `@tanstack/react-query`, `react-hook-form` + `zod`, `@shopify/flash-list`, `react-native-reanimated`, Cashfree PG SDK (payments), `react-native-qrcode-svg`, MSG91 OTP widget (`@msg91comm/sendotp-react-native`)
- Tests: Jest (`jest-expo`) + Testing Library; Detox configured for e2e (master & guard)

## Backend & auth (all three apps)

- Base URL: `https://society-gate-backend-gsrq.onrender.com` — master uses `/api/v1` in the baseURL, **guard does not** (it puts the prefix in each call). Don't "fix" one to match the other without checking the call sites.
- Login is **phone + OTP via MSG91** (`POST /auth/otp/send`, `/auth/otp/verify`).
- `src/services/api.ts` in each app is an axios instance with:
  - request interceptor attaching `Bearer <accessToken>` from `useAuthStore`
  - response interceptor doing **silent refresh on 401** with a queue (`pendingQueue`) so parallel 401s wait for one refresh, then retry; on refresh failure → `logout()`
  - master skips refresh for `/resident/onboarding`, `/society-registration`, `/upload` (these legitimately 401 during onboarding)
  - master logs every request/response through `src/logger/apiLogger.ts`
- Tokens/user/contexts persist in SecureStore under `accessToken`, `refreshToken`, `auth_user`, `auth_app_type`, `auth_contexts`, `auth_selected_resident_context`, `auth_selected_admin_context`.
- Full endpoint reference: `s-gate-master/endPoints.txt` (large), plus `API_DOCUMENTATION.md`, `AUTH_USAGE.md`, `ONBOARDING_API_HANDOFF.md`, `backend_audit.md`.

## s-gate-master layout

```
src/
  app/                      # expo-router routes
    _layout.tsx             # root: fonts, token load, push registration, permission enforcement, role routing
    login.tsx               # phone + OTP
    onboarding.tsx          # first-launch carousel (SecureStore flag "onboarding_seen")
    (onboarding)/           # resident KYC: resident-type → select-city → society-search → select-block
                            #   → select-flat → document-upload → review-submit → approval-status / add-flat-status
    (resident)/             # tabs: home · notices · deliveries · society · profile
                            #   + amenities, approvals, complaints, daily-help, documents, elections, emergency,
                            #     family, my-passes, pre-approvals, search-vehicle, society-dues, staff, vehicles, household
    (admin)/                # society admin: residents, flats, guards, gate-passes, gate-points, payments, vehicles,
                            #   complaints, community, elections, notices, emergencies, onboarding-requests, approval-requests, settings
    (superadmin)/           # platform-level society registration requests
  components/               # shared UI; Shared*Screen.tsx files are used by BOTH resident and admin routes
  screens/                  # thin wrappers around the Shared* components
  services/                 # one file per domain (gate, complaints, profile, staff, billing, upload, emergency, …)
  store/                    # useAuthStore, useGateStore, useNotificationStore, useOnboardingStore, useProfileStore
  utils/contextGuards.ts    # resident-vs-admin context classification (see below)
  constants/Sgate-theme.ts  # THE design system
  logger/, hooks/, types/, __tests__/
```

**Role routing** happens in `src/app/_layout.tsx` off `useAuthStore`: RESIDENT → `(onboarding)` if `requiresOnboarding`, else `(resident)/home`; ADMIN → `(admin)`; SUPER_ADMIN → `(superadmin)`.

### Multi-context ("workspace") model — important
A user can belong to several flats/societies and hold both resident and admin roles. Contexts come from `GET /users/resident-app/contexts`; switching is `POST /users/resident-app/switch-context { membershipId }`, which **returns fresh access/refresh tokens + updated user that must be stored immediately**. `useAuthStore` keeps `userContexts`, `selectedResidentContextId`, `selectedAdminContextId`; `src/utils/contextGuards.ts` decides which contexts are resident (have a flat identity) vs admin (admin role or permission fields), deduping admin contexts per society. On switch, reset `useGateStore`/`useProfileStore`/`useNotificationStore` and invalidate the react-query client. UI: `ResidentContextPicker` (dropdown on Home, bottom sheet from Profile) — see `codex.md` for the agreed UX contract.

### Design system — use it, don't invent
`src/constants/Sgate-theme.ts` exports `SgateColors`, `SgateSpacing`, `SgateRadius`, `SgateLayout`, `SgateSurfaces`, `SgateFonts`, `SgateTypography`, `SgateShadows`.
Palette is black / gold (`#FFB800`) / white / soft neutral (`bg #F5F4F0`). Font family is **Sora** (loaded via `hooks/useFonts.ts`; use `SgateTypography`, not raw `fontWeight`). Icons come from `@expo/vector-icons`. Standard gutter 20, control height 52, card radius 16. Use `SgateSurfaces.card/input/sheet` rather than re-declaring borders and radii.

## s-gate-guard-main layout

Flat routes under `src/app/`: `index` (dashboard), `auth`, `new-entry`, `entry-waiting`, `scan-verify` (QR via `expo-camera`), `staff-scan`, `today-entries`, `approvals`, `emergencies`, `profile`. Own smaller `constants/theme.ts`, `store/useAuthStore.ts`, `services/api.ts`. Guard's api.ts redirects to `/login` on auth failure.

## s-gate-staff-main layout

Simplest app. `app/`: `index`, `login`, `pass` (QR gate pass), `schedule`, `bookings` (work requests), `profile`; helpers in `src/{constants,services,store,types}`. Push uses the **native FCM device token** (`getDevicePushTokenAsync`, registered via `PATCH /staff-app/fcm-token`) — *not* an Expo push token, because the backend sends through Firebase Admin to `StaffAccount.fcmToken`. Its `CLAUDE.md` just includes `AGENTS.md`, which says: read the versioned Expo docs before writing code.

## Commands (run inside an app folder)

```bash
npm install
npm start                 # expo start  (staff: expo start --dev-client)
npm run android           # expo run:android   — dev client, not Expo Go
npm run ios
npm run lint              # expo lint
npm test                  # jest (master & guard)
npm run test:coverage
npm run e2e:build:android && npm run e2e:test:android   # detox
```

Master has `patch-package` on postinstall (`patches/`) and an EAS project (`eas.json`, projectId `7286df46-…`). Tests live in `src/__tests__/**/*.test.{ts,tsx}`.

## Working notes / conventions

- Prefer editing the `Shared*Screen` component over duplicating a screen for the other role.
- New API calls go in `src/services/<domain>.ts` and use the shared `api` instance — never a bare `axios`/`fetch`.
- Screens are large single files by design here; keep new sub-components in `src/components/<domain>/`.
- `permissions` enforcement (notifications + location) is mandatory and lives in the root `_layout.tsx`; don't bypass it.
- Repo root has `.claude/settings.json` with pre-approved commands; `s-gate-master/` contains many PNG/MP4 screenshots used as visual QA references, plus expo/metro log files — ignore them when searching.
- Useful docs already in `s-gate-master/`: `MANUAL_QA_SCREENS.md` (exhaustive screen-by-screen QA checklist — best map of the app), `implementation_plan.md` (home-screen redesign plan), `codex.md` (context switcher spec).

## Recent work (as of Sep 2026)

- **Home screen premium redesign** (`implementation_plan.md`): resident/admin home split into modular pieces under `src/components/home/` — `ResidentHomeDashboard`, `ResidentHomeHeader`, `ResidentHomeWidgets`, `ResidentHomeTheme`, `HeroCard`, `QuickActions`, `WaitingGateCard`, `ActivityCard`, `EmptyState`, `HomeSkeletons`, all orchestrated by `SharedHomeScreen.tsx`. Old `ResidentHomeScreen`/`AdminHomeScreen` are now thin wrappers.
- **Multi-flat context switcher** shipped (Home header dropdown + Profile bottom sheet, `contextGuards.ts` + tests).
- Pre-approvals / passes reworked: `PreApproveSheet`, `QRCarousel`, `SelectGuestsPanel`, `my-passes`.
- Layout primitives consolidated: `AppScreenLayout`, `ScreenHeader`, `AnimatedBottomSheetModal`, `SafeBottomSheetSurface`, `SgateTabBar` / `AdminTabBar`, `ScreenTransitionMask`.
- Onboarding flow polished (document upload, review-submit, select-flat, approval-status).

_Keep this file updated when the architecture or major flows change._
