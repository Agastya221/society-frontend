# s-gate-master (S-Gate main app)

**Role routing** happens in `src/app/_layout.tsx` off `useAuthStore`: RESIDENT → `(onboarding)` if `requiresOnboarding`, else `(resident)/home`; ADMIN → `(admin)`; SUPER_ADMIN → `(superadmin)`.

## Multi-context ("workspace") model — important
A user can belong to several flats/societies and hold both resident and admin roles. Contexts come from `GET /users/resident-app/contexts`; switching is `POST /users/resident-app/switch-context { membershipId }`, which **returns fresh access/refresh tokens + updated user that must be stored immediately**. `useAuthStore` keeps `userContexts`, `selectedResidentContextId`, `selectedAdminContextId`; `src/utils/contextGuards.ts` decides which contexts are resident (have a flat identity) vs admin (admin role or permission fields), deduping admin contexts per society. On switch, reset `useGateStore`/`useProfileStore`/`useNotificationStore` and invalidate the react-query client. UI: `ResidentContextPicker` (dropdown on Home, bottom sheet from Profile) — see `codex.md` for the agreed UX contract.

## Design system — use it, don't invent
`src/constants/Sgate-theme.ts` exports `SgateColors`, `SgateSpacing`, `SgateRadius`, `SgateLayout`, `SgateSurfaces`, `SgateFonts`, `SgateTypography`, `SgateShadows`.
Palette is black / gold (`#FFB800`) / white / soft neutral (`bg #F5F4F0`). Font family is **Sora** (loaded via `hooks/useFonts.ts`; use `SgateTypography`, not raw `fontWeight`). Icons come from `@expo/vector-icons`. Standard gutter 20, control height 52, card radius 16. Use `SgateSurfaces.card/input/sheet` rather than re-declaring borders and radii.

## Conventions
- Prefer editing the `Shared*Screen` component (used by BOTH resident and admin routes) over duplicating a screen for the other role.
- Screens are large single files by design here; keep new sub-components in `src/components/<domain>/`.
- Useful docs here: `MANUAL_QA_SCREENS.md` (exhaustive screen-by-screen QA checklist — best map of the app), `implementation_plan.md` (home-screen redesign plan), `codex.md` (context switcher spec).
