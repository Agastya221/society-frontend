# Codex Notes: Home Context Switcher

## Goal

The home header society label is the entry point for switching the user's active flat/society context.

The header should show the current active home, not a generic label:

```text
Good evening, Agastya
Tower C - C401
```

or, if flat details are unavailable:

```text
Good evening, Agastya
Greenfield Heights
```

Tapping this label opens a compact dropdown-style picker below the header listing every approved context the user belongs to.

The Profile > Manage Flats section is the second entry point:

- "Manage My Flats" / "Manage Society Flats" opens the same context picker as a bottom sheet.
- "Add Flat/Villa/Office" starts the normal onboarding selection flow in logged-in add-flat mode.
- After submitting an add-flat request, the app returns to Profile instead of first-time approval onboarding.

## UI Guardrails

- Keep the existing S-Gate home layout intact: logo left, text middle, notification bell right.
- Do not increase header height unless the text naturally wraps. The active context line must remain one line.
- Use existing S-Gate tokens from `src/constants/Sgate-theme.ts`.
- Keep the palette black/gold/white/soft neutral. Do not introduce a new dominant color.
- Use familiar icons from `@expo/vector-icons`; no custom SVG for this.
- The switcher should feel like a location/home picker, similar to food delivery apps.
- On Home, use a modal dropdown near the header with a dim backdrop.
- On Profile, use a modal bottom sheet with rounded top corners and a dim backdrop.
- One switcher only: society + flat are selected together from one row.
- Include an "Add another flat / society" action that routes to onboarding.

## API Contract

Fetch contexts:

```text
GET /users/resident-app/contexts
```

Switch context:

```text
POST /users/resident-app/switch-context
{ "membershipId": "..." }
```

The switch response returns fresh access/refresh tokens and an updated user. Store those immediately so all existing APIs use the selected active context.
