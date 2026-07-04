# S-Gate Home Screen Premium Redesign

Redesign the Home screen for both Resident and Admin dashboards with a premium, CRED/Linear-quality visual feel, modular components, and dynamic status representation, while preserving all existing business logic, APIs, navigation, and state management.

---

## 1. Feature Parity Audit & Screen Strategy

We will NOT delete the old files immediately. Instead, `ResidentHomeScreen.tsx` and `AdminHomeScreen.tsx` will be converted into thin wrapper shells that invoke the upgraded `<HomeScreen role="resident" />` and `<HomeScreen role="admin" />`. This preserves exact entry routing, safe area setups, and layout containers during the validation period.

### Resident Home Parity Points
- **Hooks & Contexts:** `useAuthStore`, `useGateStore`, `useNotificationStore`, `useOnboardingStore`, `useSafeAreaInsets`, `useRouter`, `useFocusEffect`.
- **Data Loading & Refreshing:** `fetchPendingRequests()`, `fetchUnreadCount()`, `fetchEntries({ status: 'CHECKED_IN' })`, `getResidentContexts()`. Pull-to-refresh must refresh all of these.
- **Context/Workspace Switcher:** Switching context via `switchResidentContext` and syncing contexts into global `useAuthStore`. Navigating to `/(admin)` or `/(resident)/home` depending on role, resetting Zustand stores (`useGateStore`, `useProfileStore`, `useNotificationStore`) on context switch, and invalidating query client.
- **Onboarding Flow Triggers:** `startAddMembershipFlow`, `startRequestCorrectionFlow` with drafts, document upload routing.
- **Gate Action Methods:** Approving/denying visitors via `approveRequest(id)` / `rejectRequest(id)`.
- **Modals & Sheets:** `PreApproveSheet`, `ResidentContextPicker`, `ResidentRequestDetailsSheet`.
- **SOS Navigation:** Route `/(resident)/emergency/create`.

### Admin Home Parity Points
- **Hooks & Contexts:** `useAuthStore`, `useNotificationStore`, `useOnboardingStore`, `useSafeAreaInsets`, `useRouter`, `useFocusEffect`.
- **Data Loading & Refreshing:** `fetchUnreadCount()`, `getResidentContexts()`, and `fetchAdminData` (fetching pending material/move gate passes from `/gate/passes?status=PENDING`).
- **Gate Pass Approvals:** Approving society gate passes via `approveGatePass(id)` from `@/services/gatePass` and re-fetching admin passes.
- **Context Switcher:** Identical workspace reset/invalidation logic as resident context switching.
- **SOS Navigation:** Route `/(admin)/sos-create`.

---

## 2. Modular Architecture

The home screen will be split into modular, focused components under `src/components/home/`:

```
src/components/home/
├── HomeHeader.tsx          # Compact, clean header with tower & society info
├── RoleSwitcher.tsx        # Premium button for switching between Resident & Admin
├── HeroCard.tsx            # Soft yellow gradient card with dynamic contextual state & click actions
├── QuickActions.tsx        # Scrollable/collapsible grid of tools supporting dynamic counts + All Tools redirect
├── WaitingGateCard.tsx     # Clean display of pending gate entries (uses EmptyState)
├── ActivityCard.tsx        # Today's activity list (uses EmptyState)
├── EmptyState.tsx          # Standardized empty state layout
├── HomeSkeletons.tsx       # Standardized loading skeletons for all sections
└── HomeScreen.tsx          # Orchestrator rendering sections in configurable order
```

---

## 3. Detailed Component Specs

### 1. Header & Switcher (`HomeHeader.tsx` & `RoleSwitcher.tsx`)
*   **Props:** 
    *   `towerName: string`
    *   `societyName: string`
    *   `notificationCount: number`
    *   `onNotificationPress: () => void`
    *   `onContextPress: () => void`
    *   `showWorkspaceSwitch: boolean`
    *   `onWorkspaceSwitch: () => void`
    *   `currentRole: 'resident' | 'admin'`
*   **Design:** Compact layout (~90dp). No custom gradient backgrounds. Large tower name (28-30 bold), small society name (14 medium) with location pin. Clean round notification bell with badge.
*   **RoleSwitcher:** Decoupled. Rendered as a separate pill (`Resident | Admin` or `Admin View`) next to the bell, receiving status/action callbacks from existing state.

### 2. Dynamic Hero Card (`HeroCard.tsx`)
*   **Props:**
    *   `role: 'resident' | 'admin'`
    *   `pendingRequestsCount: number`  # Resident: visitors waiting
    *   `pendingApprovalsCount: number` # Admin: onboarding / gate passes approvals pending
    *   `duesPendingCount?: number`     # Resident: pending dues
    *   `onAction: (target: string) => void`
*   **Logic & Click Actions:**
    *   **Resident:** 
        *   If `pendingRequestsCount > 0`: title = `"${pendingRequestsCount} visitors waiting"`, pill = `"Gate action required"`, **onTap** = navigates to `/(resident)/approvals`.
        *   Else if `duesPendingCount > 0`: title = `"${duesPendingCount} dues pending"`, pill = `"Tap to view dues"`, **onTap** = navigates to `/(resident)/society-dues`.
        *   Else: title = `"Everything looks good today."`, pill = `"✓ Society is running smoothly"`, **onTap** = null.
    *   **Admin:**
        *   If `pendingApprovalsCount > 0`: title = `"${pendingApprovalsCount} actions pending"`, pill = `"Approvals required"`, **onTap** = navigates to `/(admin)/gate-passes` or onboarding requests.
        *   Else: title = `"Everything looks good today."`, pill = `"✓ Society is running smoothly"`, **onTap** = null.
*   **Design:** Soft yellow gradient card, building illustration (using local asset shape elements to avoid network dependencies), status pill with green/dark checkmark.

### 3. Expandable Quick Actions (`QuickActions.tsx`)
*   **Props:**
    *   `actions: Array<HomeQuickAction>`
    *   `onActionPress: (route: string) => void`
*   **Grid Specs:** Uppercase "QUICK ACTIONS" label. Two rows, four columns grid layout. White rounded cards with soft shadows, pastel icon backgrounds.
*   **Scalability:**
    *   If actions length > 8, render the first 7 actions and show a "**More Tools**" card.
    *   **Tapping "More Tools" will redirect directly to the existing All Tools screen** (`/(resident)/all-tools` or `/(admin)/all-tools`).

### 4. Floating SOS Position
*   Keep the **Floating SOS button only** for persistent global access.
*   Ensure it does not cover the bottom tab navigator or cards by positioning it with a safe bottom margin offset (`bottomOffset = 80` to float nicely above the tab bar).

### 5. Admin Section Clarity
*   **Action Required (Pending Passes):** Renders pending material/move gate passes using the clean card layout list.
*   **Onboarding Requests:** Render a summary or link to onboarding requests.
*   **Today's Entries:** Show visitor entry logs check-ins and check-outs with status labels using standard card styling.

### 6. Standardized Empty States (`EmptyState.tsx`)
*   Create a single `<EmptyState />` component reused across Waiting at Gate, Today's Activity, and other sections.
*   **Props:**
    *   `iconName: string` (Lucide/MaterialCommunityIcons)
    *   `iconBg?: string`
    *   `title: string`
    *   `description: string`
    *   `ctaLabel?: string`
    *   `onCtaPress?: () => void`

### 7. Standardized Skeletons (`HomeSkeletons.tsx`)
*   `HeaderSkeleton`
*   `HeroCardSkeleton`
*   `QuickActionsSkeleton`
*   `GateSkeleton`
*   `ActivitySkeleton`

---

## 4. Verification Plan

### Automated Tests
- Run existing Detox/Jest tests to verify no regressions on login bypasses, onboarding requests, or store updates:
  ```bash
  npm run test
  ```

### Manual Verification
1. Verify loading state skeletons render smoothly during context switching.
2. Toggle workspace between Resident and Admin. Verify `RoleSwitcher` pill responds and transitions layouts cleanly.
3. Verify clicking the Hero card with pending items redirects to the correct screens.
4. Verify empty states of Gate list and Activity list have consistent alignments, icons, and text sizes.
5. Verify safe areas on iOS notches and different Android aspect ratios.
6. Verify SOS button floats above the bottom tab bar.
