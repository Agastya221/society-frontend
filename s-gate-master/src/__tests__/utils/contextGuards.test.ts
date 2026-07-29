import type { ResidentContext } from '@/services/profile.service';
import {
    formatAdminRole,
    formatResidentRelationship,
    getActiveContextForRole,
    getAdminContexts,
    getContextSubtitleForRole,
    getContextTitleForRole,
    getResidentContexts,
    hasRoleContexts,
    isAdminContext,
    isResidentContext,
} from '@/utils/contextGuards';

function context(overrides: Partial<ResidentContext>): ResidentContext {
    return {
        membershipId: 'membership-1',
        societyId: 'society-1',
        societyName: 'Dalma Heights Residency',
        societyCity: 'Patna',
        societyIsActive: true,
        flatId: null,
        flatNumber: null,
        blockId: null,
        blockName: null,
        floor: null,
        label: 'Dalma Heights Residency',
        subtitle: 'Dalma Heights Residency',
        role: 'RESIDENT',
        residentType: null,
        isOwner: false,
        isLivingHere: false,
        canUseDailyGateFeatures: false,
        isPrimary: false,
        isDefault: false,
        isActiveContext: false,
        ...overrides,
    };
}

describe('contextGuards', () => {
    const residentHome = context({
        membershipId: 'resident-c802',
        flatId: 'flat-c802',
        flatNumber: 'C802',
        blockName: 'Tower C',
        label: 'Tower C - C802',
        residentType: 'TENANT',
        isLivingHere: true,
        canUseDailyGateFeatures: true,
    });

    const secondHome = context({
        membershipId: 'resident-a101',
        flatId: 'flat-a101',
        flatNumber: 'A101',
        blockName: 'Tower A',
        label: 'Tower A - A101',
        residentType: 'OWNER',
        isOwner: true,
    });

    const adminSociety = context({
        membershipId: 'admin-dalma',
        role: 'ADMIN',
        flatId: null,
        flatNumber: null,
        label: 'Dalma Heights Residency',
        subtitle: 'Society Admin',
    });

    const securitySociety = context({
        membershipId: 'security-sunshine',
        societyId: 'society-2',
        societyName: 'Sunshine Residency',
        role: 'SECURITY',
        label: 'Sunshine Residency',
    });

    it('separates resident homes from admin societies for a dual-role user', () => {
        const contexts = [residentHome, adminSociety];

        expect(getResidentContexts(contexts)).toEqual([residentHome]);
        expect(getAdminContexts(contexts)).toEqual([adminSociety]);
        expect(hasRoleContexts(contexts)).toEqual({ resident: true, admin: true });
    });

    it('keeps Your Homes free of admin-only contexts', () => {
        expect(isResidentContext(adminSociety)).toBe(false);
        expect(getResidentContexts([adminSociety])).toEqual([]);
    });

    it('keeps Your Societies free of resident-only contexts', () => {
        expect(isAdminContext(residentHome)).toBe(false);
        expect(getAdminContexts([residentHome])).toEqual([]);
    });

    it('supports multiple flats and multiple admin societies', () => {
        const contexts = [residentHome, secondHome, adminSociety, securitySociety];

        expect(getResidentContexts(contexts).map((item) => item.membershipId)).toEqual([
            'resident-c802',
            'resident-a101',
        ]);
        expect(getAdminContexts(contexts).map((item) => item.membershipId)).toEqual([
            'admin-dalma',
            'security-sunshine',
        ]);
    });

    it('restores the selected context independently per role', () => {
        const contexts = [residentHome, secondHome, adminSociety, securitySociety];

        expect(getActiveContextForRole('resident', contexts, 'resident-a101')?.membershipId).toBe('resident-a101');
        expect(getActiveContextForRole('admin', contexts, 'security-sunshine')?.membershipId).toBe('security-sunshine');
    });

    it('formats resident and admin display metadata differently', () => {
        expect(getContextTitleForRole('resident', residentHome)).toBe('Tower C - C802');
        expect(getContextSubtitleForRole('resident', residentHome)).toBe('Dalma Heights Residency');
        expect(formatResidentRelationship(residentHome)).toBe('Tenant');

        expect(getContextTitleForRole('admin', adminSociety)).toBe('Dalma Heights Residency');
        expect(getContextSubtitleForRole('admin', adminSociety)).toBe('Society Admin');
        expect(formatAdminRole(adminSociety)).toBe('Society Admin');
    });

    it('does not label a resident-owned flat as Society Admin', () => {
        const adminWhoOwnsFlat = context({
            membershipId: 'owner-admin-flat',
            role: 'ADMIN',
            flatId: 'flat-a101',
            flatNumber: 'A101',
            blockName: 'Tower A',
            label: 'Tower A - A101',
            residentType: 'OWNER',
            isOwner: true,
        });

        expect(isResidentContext(adminWhoOwnsFlat)).toBe(true);
        expect(formatResidentRelationship(adminWhoOwnsFlat)).toBe('Owner');
    });

    it('dedupes admin society access separately from owned resident flats', () => {
        const adminWhoOwnsFlat = context({
            membershipId: 'owner-admin-flat',
            role: 'ADMIN',
            flatId: 'flat-a101',
            flatNumber: 'A101',
            blockName: 'Tower A',
            label: 'Tower A - A101',
            residentType: 'OWNER',
            isOwner: true,
        });
        const societyAdmin = context({
            membershipId: 'society-admin',
            role: 'ADMIN',
            flatId: null,
            flatNumber: null,
            label: 'Dalma Heights Residency',
            subtitle: 'Society Admin',
        });

        expect(getResidentContexts([adminWhoOwnsFlat, societyAdmin]).map((item) => item.membershipId)).toEqual([
            'owner-admin-flat',
        ]);
        expect(getAdminContexts([adminWhoOwnsFlat, societyAdmin]).map((item) => item.membershipId)).toEqual([
            'society-admin',
        ]);
    });
});
