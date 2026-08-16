import type { ResidentContext } from '@/services/profile.service';
import type { UserRole } from '@/components/home/homeToolsConfig';

const ADMIN_ROLES = new Set([
    'ADMIN',
    'SUPER_ADMIN',
    'SOCIETY_ADMIN',
    'STAFF',
    'SECURITY',
    'GUARD',
    'MANAGER',
    'COMMITTEE',
    'COMMITTEE_MEMBER',
]);

function norm(value?: string | null): string {
    return String(value ?? '').trim().toUpperCase();
}

function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

function hasHomeIdentity(context: ResidentContext): boolean {
    return hasValue(context.flatId) || hasValue(context.flatNumber);
}

function adminScopeKey(context: ResidentContext): string {
    return context.societyId || norm(context.societyName) || context.membershipId;
}

function hasAdminPermissionFields(context: ResidentContext): boolean {
    const raw = context as any;
    return Boolean(
        raw.adminRole ||
        raw.adminType ||
        raw.isAdmin ||
        raw.isSocietyAdmin ||
        raw.isSecurity ||
        raw.isManager ||
        raw.isCommitteeMember ||
        (Array.isArray(raw.permissions) && raw.permissions.length > 0)
    );
}

export function isAdminContext(context: ResidentContext): boolean {
    return ADMIN_ROLES.has(norm(context.role)) || hasAdminPermissionFields(context);
}

export function isResidentContext(context: ResidentContext): boolean {
    return hasHomeIdentity(context);
}

export function getResidentContexts(contexts: ResidentContext[] = []): ResidentContext[] {
    return contexts.filter(isResidentContext);
}

export function getAdminContexts(contexts: ResidentContext[] = []): ResidentContext[] {
    const bySociety = new Map<string, ResidentContext>();

    contexts.filter(isAdminContext).forEach((context) => {
        const key = adminScopeKey(context);
        const existing = bySociety.get(key);

        if (!existing) {
            bySociety.set(key, context);
            return;
        }

        const shouldPreferContext =
            (!hasHomeIdentity(context) && hasHomeIdentity(existing)) ||
            (context.isActiveContext && !existing.isActiveContext);

        if (shouldPreferContext) {
            bySociety.set(key, context);
        }
    });

    return Array.from(bySociety.values());
}

export function getActiveContextForRole(
    role: UserRole,
    contexts: ResidentContext[] = [],
    selectedContextId?: string | null,
): ResidentContext | null {
    const scopedContexts = role === 'admin'
        ? getAdminContexts(contexts)
        : getResidentContexts(contexts);

    return (
        scopedContexts.find((context) => context.membershipId === selectedContextId) ??
        scopedContexts.find((context) => context.isActiveContext) ??
        scopedContexts[0] ??
        null
    );
}

export function getContextTitleForRole(role: UserRole, context: ResidentContext): string {
    if (role === 'admin') {
        return context.societyName || context.label;
    }

    return context.label || [context.blockName, context.flatNumber].filter(Boolean).join(' - ');
}

export function getContextSubtitleForRole(role: UserRole, context: ResidentContext): string {
    if (role === 'admin') {
        return formatAdminRole(context);
    }

    return context.societyName;
}

export function formatResidentRelationship(context: ResidentContext): string {
    const residentType = norm(context.residentType);
    if (residentType === 'TENANT') return 'Tenant';
    if (residentType === 'FAMILY' || residentType === 'FAMILY_MEMBER') return 'Family Member';
    if (residentType === 'OWNER' || context.isOwner) return 'Owner';
    if (norm(context.role) === 'TENANT') return 'Tenant';
    if (norm(context.role) === 'OWNER') return 'Owner';
    if (norm(context.role) === 'FAMILY' || norm(context.role) === 'FAMILY_MEMBER') return 'Family Member';
    return 'Resident';
}

export function formatAdminRole(context: ResidentContext): string {
    const raw = (context as any).adminRole ?? context.role;
    const role = norm(raw);
    switch (role) {
        case 'SUPER_ADMIN':
            return 'Super Admin';
        case 'ADMIN':
        case 'SOCIETY_ADMIN':
            return 'Society Admin';
        case 'SECURITY':
        case 'GUARD':
            return 'Security';
        case 'MANAGER':
            return 'Manager';
        case 'COMMITTEE':
        case 'COMMITTEE_MEMBER':
            return 'Committee Member';
        case 'STAFF':
            return 'Staff';
        default:
            return String(raw ?? 'Admin').replace(/_/g, ' ').toLowerCase()
                .replace(/\b\w/g, (char) => char.toUpperCase());
    }
}

export function hasRoleContexts(contexts: ResidentContext[] = []): { resident: boolean; admin: boolean } {
    return {
        resident: getResidentContexts(contexts).length > 0,
        admin: getAdminContexts(contexts).length > 0,
    };
}
