import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors } from '@/constants/Sgate-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolRole = 'resident' | 'admin';

export interface ToolItem {
    id: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    bg: string;
    color: string;
    roles: ToolRole[];
    /** Route to navigate to (use 'MODAL:preapprove' for modal actions) */
    route: string;
    /** Section this tool belongs to */
    section: string;
}

// ─── Section Definitions ──────────────────────────────────────────────────────

export interface ToolSection {
    id: string;
    title: string;
    roles: ToolRole[];
}

export const toolSections: ToolSection[] = [
    // ── Admin-only ──
    { id: 'administration', title: 'ADMINISTRATION', roles: ['admin'] },

    // ── Shared / Resident ──
    { id: 'essentials',     title: 'ESSENTIALS',           roles: ['resident'] },
    { id: 'community',     title: 'SOCIETY & COMMUNITY',  roles: ['resident'] },
    { id: 'personal',      title: 'PERSONAL',             roles: ['resident'] },

    // ── Admin personal tools ──
    { id: 'admin-personal', title: 'MY PERSONAL FLAT',    roles: ['admin'] },
];

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const allTools: ToolItem[] = [
    // ═══════════════════════════════════════════════════════════════════════
    //  ADMINISTRATION (admin only)
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'admin-staff',        icon: 'briefcase-outline',        label: 'Staff',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'administration', route: '/(admin)/staff' },
    { id: 'admin-broadcast',    icon: 'bullhorn-outline',         label: 'Broadcast',       bg: SgateColors.redBg,     color: SgateColors.red,      roles: ['admin'], section: 'administration', route: '/(admin)/broadcast' },
    { id: 'admin-gatepasses',   icon: 'clipboard-check-outline',  label: 'Gate Passes',     bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'administration', route: '/(admin)/gate-passes' },
    { id: 'admin-complaints',   icon: 'alert-circle-outline',     label: 'Complaints',      bg: SgateColors.redBg,     color: SgateColors.red,      roles: ['admin'], section: 'administration', route: '/(admin)/complaints' },
    { id: 'admin-guards',       icon: 'shield-outline',           label: 'Guards',          bg: SgateColors.greenBg,   color: SgateColors.green,    roles: ['admin'], section: 'administration', route: '/(admin)/guards' },
    { id: 'admin-residents',    icon: 'account-group-outline',    label: 'Residents',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['admin'], section: 'administration', route: '/(admin)/onboarding-requests' },
    { id: 'admin-emergencies',  icon: 'flash-outline',            label: 'Emergencies',     bg: SgateColors.redBg,     color: SgateColors.red,      roles: ['admin'], section: 'administration', route: '/(admin)/emergencies' },
    { id: 'admin-community',    icon: 'message-outline',          label: 'Community',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['admin'], section: 'administration', route: '/(admin)/community' },
    { id: 'admin-polls',        icon: 'poll',                     label: 'Polls',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'administration', route: '/(admin)/elections' },
    { id: 'admin-notices',      icon: 'bell-outline',             label: 'Notices',         bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['admin'], section: 'administration', route: '/(admin)/notices' },
    { id: 'admin-payments',     icon: 'credit-card-outline',      label: 'Payments',        bg: SgateColors.greenBg,   color: SgateColors.green,    roles: ['admin'], section: 'administration', route: '/(admin)/payments' },
    { id: 'admin-flats',        icon: 'home-city-outline',        label: 'Flats',           bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['admin'], section: 'administration', route: '/(admin)/flats' },
    { id: 'admin-vehicles',     icon: 'car-outline',              label: 'Vehicles',        bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'administration', route: '/(admin)/vehicles' },
    { id: 'admin-settings',     icon: 'cog-outline',              label: 'Settings',        bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['admin'], section: 'administration', route: '/(admin)/settings' },

    // ═══════════════════════════════════════════════════════════════════════
    //  ESSENTIALS (resident only)
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'pre-approve',     icon: 'account-check-outline',    label: 'Pre-Approve',     bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['resident'], section: 'essentials', route: 'MODAL:preapprove' },
    { id: 'my-passes',       icon: 'smart-card-outline',       label: 'My Passes',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['resident'], section: 'essentials', route: '/(resident)/my-passes' },
    { id: 'expect-delivery', icon: 'package-variant',          label: 'Expect Delivery', bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['resident'], section: 'essentials', route: 'MODAL:preapprove_delivery' },
    { id: 'sos-alert',       icon: 'alert-outline',            label: 'SOS Alert',       bg: SgateColors.redBg,     color: SgateColors.red,      roles: ['resident'], section: 'essentials', route: '/(resident)/emergency/create' },

    // ═══════════════════════════════════════════════════════════════════════
    //  SOCIETY & COMMUNITY (resident only)
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'community',       icon: 'message-outline',              label: 'Community',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['resident'], section: 'community', route: '/(resident)/communication' },
    { id: 'local-directory', icon: 'book-open-blank-variant',      label: 'Local Directory', bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['resident'], section: 'community', route: '/(resident)/local-directory' },
    { id: 'daily-help',     icon: 'account-wrench-outline',        label: 'Daily Help',      bg: SgateColors.greenBg,   color: SgateColors.green,    roles: ['resident'], section: 'community', route: '/(resident)/daily-help' },
    { id: 'amenities',      icon: 'calendar-outline',              label: 'Amenities',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['resident'], section: 'community', route: '/(resident)/amenities' },
    { id: 'polls',          icon: 'poll',                          label: 'Polls',           bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['resident'], section: 'community', route: '/(resident)/elections' },
    { id: 'documents',      icon: 'folder-outline',                label: 'Documents',       bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['resident'], section: 'community', route: '/(resident)/documents' },
    { id: 'notices',        icon: 'bell-outline',                  label: 'Notices',         bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['resident'], section: 'community', route: '/(resident)/notices' },

    // ═══════════════════════════════════════════════════════════════════════
    //  PERSONAL (resident only)
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'society-dues',    icon: 'receipt-text-outline',  label: 'Society Dues',    bg: SgateColors.redBg,     color: SgateColors.red,      roles: ['resident'], section: 'personal', route: '/(resident)/society-dues' },
    { id: 'my-vehicles',    icon: 'car-outline',            label: 'My Vehicles',     bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['resident'], section: 'personal', route: '/(resident)/vehicles' },
    { id: 'search-vehicle', icon: 'car-search-outline',     label: 'Search Vehicle',  bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['resident'], section: 'personal', route: '/(resident)/search-vehicle' },
    { id: 'complaints',     icon: 'headset',                label: 'Complaints',      bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['resident'], section: 'personal', route: '/(resident)/complaints' },

    // ═══════════════════════════════════════════════════════════════════════
    //  MY PERSONAL FLAT (admin's personal tools)
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'admin-preapprove',  icon: 'account-check-outline',   label: 'Pre-Approve',     bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'admin-personal', route: 'MODAL:preapprove' },
    { id: 'admin-mypasses',   icon: 'smart-card-outline',      label: 'My Passes',       bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['admin'], section: 'admin-personal', route: '/(admin)/my-passes' },
    { id: 'admin-mydues',     icon: 'receipt-text-outline',     label: 'My Dues',         bg: SgateColors.greenBg,   color: SgateColors.green,    roles: ['admin'], section: 'admin-personal', route: '/(admin)/my-dues' },
    { id: 'admin-delivery',   icon: 'package-variant',          label: 'Expect Delivery', bg: SgateColors.surface,   color: SgateColors.t2,       roles: ['admin'], section: 'admin-personal', route: 'MODAL:preapprove_delivery' },
    { id: 'admin-myvehicles', icon: 'car-outline',              label: 'My Vehicles',     bg: SgateColors.blueBg,    color: SgateColors.blue,     roles: ['admin'], section: 'admin-personal', route: '/(resident)/vehicles' },
    { id: 'admin-myamenities',icon: 'coffee-outline',           label: 'My Amenities',    bg: SgateColors.goldPale,  color: SgateColors.goldDeep, roles: ['admin'], section: 'admin-personal', route: '/(resident)/amenities' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Filter sections relevant to the given role */
export function getSectionsForRole(role: ToolRole): ToolSection[] {
    return toolSections.filter(s => s.roles.includes(role));
}

/** Filter tools for a given role and section */
export function getToolsForSection(role: ToolRole, sectionId: string): ToolItem[] {
    return allTools.filter(t => t.roles.includes(role) && t.section === sectionId);
}
