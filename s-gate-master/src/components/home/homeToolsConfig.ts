import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors } from '@/constants/Sgate-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'resident' | 'admin';

export interface HomeQuickAction {
    id: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    color: string;
    bg: string;
    roles: UserRole[];
    /**
     * Route to navigate to.
     * Use 'MODAL:preapprove' for modal actions.
     */
    route: string;
}

// ─── Quick Action Definitions ─────────────────────────────────────────────────
// Order matters: items appear in the grid in the order defined here.
// The last item should always be "All Tools" for the given role.

export const homeQuickActions: HomeQuickAction[] = [
    // ── Shared: Pre-Approve ──
    {
        id: 'preApprove',
        icon: 'account-check-outline',
        label: 'Pre-Approve',
        color: SgateColors.goldDeep,
        bg: SgateColors.goldPale,
        roles: ['resident', 'admin'],
        route: 'MODAL:preapprove',
    },

    // ── Resident-only ──
    {
        id: 'myPasses',
        icon: 'smart-card-outline',
        label: 'My Passes',
        color: SgateColors.blue,
        bg: SgateColors.blueBg,
        roles: ['resident'],
        route: '/(resident)/my-passes',
    },
    {
        id: 'delivery',
        icon: 'package-variant',
        label: 'Delivery',
        color: SgateColors.t2,
        bg: SgateColors.surface,
        roles: ['resident'],
        route: '/expect-delivery',
    },
    {
        id: 'myVehicles',
        icon: 'car-outline',
        label: 'My Vehicles',
        color: SgateColors.t2,
        bg: SgateColors.surface,
        roles: ['resident'],
        route: '/(resident)/vehicles',
    },
    {
        id: 'dues',
        icon: 'receipt-text-outline',
        label: 'Dues',
        color: SgateColors.red,
        bg: SgateColors.redBg,
        roles: ['resident'],
        route: '/(resident)/society-dues',
    },
    {
        id: 'dailyHelp',
        icon: 'account-wrench-outline',
        label: 'Daily Help',
        color: SgateColors.green,
        bg: SgateColors.greenBg,
        roles: ['resident'],
        route: '/(resident)/daily-help',
    },
    {
        id: 'community',
        icon: 'message-outline',
        label: 'Community',
        color: SgateColors.blue,
        bg: SgateColors.blueBg,
        roles: ['resident'],
        route: '/(resident)/communication',
    },

    // ── Admin-only ──
    {
        id: 'adminMyPasses',
        icon: 'smart-card-outline',
        label: 'My Passes',
        color: SgateColors.blue,
        bg: SgateColors.blueBg,
        roles: ['admin'],
        route: '/(admin)/my-passes',
    },
    {
        id: 'adminMyDues',
        icon: 'receipt-text-outline',
        label: 'My Dues',
        color: SgateColors.t2,
        bg: SgateColors.surface,
        roles: ['admin'],
        route: '/(admin)/my-dues',
    },
    {
        id: 'adminSOS',
        icon: 'alert-outline',
        label: 'SOS Alert',
        color: SgateColors.red,
        bg: SgateColors.redBg,
        roles: ['admin'],
        route: '/(admin)/emergencies',
    },
    {
        id: 'adminGatePasses',
        icon: 'clipboard-check-outline',
        label: 'Gate Passes',
        color: SgateColors.goldDeep,
        bg: SgateColors.goldPale,
        roles: ['admin'],
        route: '/(admin)/gate-passes',
    },
    {
        id: 'adminResidents',
        icon: 'account-group-outline',
        label: 'Residents',
        color: SgateColors.blue,
        bg: SgateColors.blueBg,
        roles: ['admin'],
        route: '/(admin)/onboarding-requests',
    },
    {
        id: 'adminGuards',
        icon: 'shield-outline',
        label: 'Guards',
        color: SgateColors.green,
        bg: SgateColors.greenBg,
        roles: ['admin'],
        route: '/(admin)/guards',
    },

    // ── All Tools (must be last per role) ──
    {
        id: 'allToolsResident',
        icon: 'view-grid-outline',
        label: 'All Tools',
        color: SgateColors.t1,
        bg: SgateColors.gold,
        roles: ['resident'],
        route: '/(resident)/all-tools',
    },
    {
        id: 'allToolsAdmin',
        icon: 'view-grid-outline',
        label: 'All Tools',
        color: SgateColors.t1,
        bg: SgateColors.gold,
        roles: ['admin'],
        route: '/(admin)/all-tools',
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get quick actions visible to the given role, in display order. */
export function getQuickActionsForRole(role: UserRole): HomeQuickAction[] {
    return homeQuickActions.filter(action => action.roles.includes(role));
}
