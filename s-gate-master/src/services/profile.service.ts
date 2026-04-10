import api from './api';
import type { FamilyMember, FamilyRole, User } from '../types/api';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = async (): Promise<User> => {
    const res = await api.get('/auth/resident-app/profile');
    return res.data.data;
};

export interface UpdateProfilePayload {
    name?: string;
    email?: string;
    photoUrl?: string;
}

export const updateProfile = async (data: UpdateProfilePayload): Promise<User> => {
    const res = await api.patch('/auth/resident-app/profile', data);
    return res.data.data;
};

// ─── Family ───────────────────────────────────────────────────────────────────

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    const res = await api.get('/resident/family');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.members ?? []);
};

export interface InviteFamilyMemberPayload {
    phone: string;
    name: string;
    email?: string;
    familyRole: FamilyRole;
}

export const inviteFamilyMember = async (
    data: InviteFamilyMemberPayload
): Promise<FamilyMember> => {
    const res = await api.post('/resident/family/invite', data);
    return res.data.data;
};

export const removeFamilyMember = async (id: string): Promise<void> => {
    await api.delete(`/resident/family/${id}`);
};

export const updateFamilyRole = async (
    memberId: string,
    familyRole: FamilyRole
): Promise<FamilyMember> => {
    const res = await api.patch<{ success: boolean; data: FamilyMember }>(
        `/resident/family/${memberId}/role`,
        { familyRole }
    );
    return res.data.data;
};
