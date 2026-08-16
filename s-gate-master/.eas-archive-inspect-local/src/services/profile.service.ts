import api from './api';
import type { FamilyMember, FamilyRole, User } from '../types/api';
import type { User as AuthUser } from '../types/auth';

// ─── Resident Contexts ───────────────────────────────────────────────────────

export interface ResidentContext {
    membershipId: string;
    societyId: string;
    societyName: string;
    societyCity?: string | null;
    societyIsActive?: boolean;
    flatId?: string | null;
    flatNumber?: string | null;
    blockId?: string | null;
    blockName?: string | null;
    floor?: string | null;
    label: string;
    subtitle: string;
    role: string;
    residentType?: 'OWNER' | 'TENANT' | string | null;
    isOwner: boolean;
    isLivingHere: boolean;
    canUseDailyGateFeatures: boolean;
    isPrimary: boolean;
    isDefault: boolean;
    isActiveContext: boolean;
}

export interface ResidentContextGroup {
    societyId: string;
    societyName: string;
    societyCity?: string | null;
    contexts: ResidentContext[];
}

export type ResidentContextRequestStatus =
    | 'DRAFT'
    | 'PENDING_DOCS'
    | 'PENDING_APPROVAL'
    | 'RESUBMIT_REQUESTED'
    | 'REJECTED'
    | string;

export interface ResidentContextRequest {
    requestId: string;
    societyId: string;
    societyName: string;
    societyCity?: string | null;
    societyIsActive?: boolean;
    flatId: string;
    flatNumber: string;
    blockId: string;
    blockName: string;
    floor?: string | null;
    label: string;
    subtitle: string;
    status: ResidentContextRequestStatus;
    residentType?: 'OWNER' | 'TENANT' | string | null;
    isLivingHere: boolean;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    resubmitReason?: string | null;
    canSwitch: false;
}

export interface ResidentRequestDocument {
    id: string;
    type: string;
    url?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    uploadedAt?: string | null;
    isVerified?: boolean;
    verifiedAt?: string | null;
}

export interface ResidentRequestDetails extends ResidentContextRequest {
    societyAddress?: string | null;
    ownerOccupancy?: string | null;
    message?: string;
    approvedAt?: string | null;
    resubmissionCount?: number;
    canDelete: boolean;
    canReapply: boolean;
    canResubmit: boolean;
    documents: ResidentRequestDocument[];
}

export interface ResidentContextsResponse {
    activeContext: ResidentContext | null;
    contexts: ResidentContext[];
    requests?: ResidentContextRequest[];
    societies: ResidentContextGroup[];
}

export interface SwitchResidentContextResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    contexts: ResidentContextsResponse;
    appType: string;
    redirectTo: 'ADMIN_PANEL' | 'RESIDENT_PANEL' | string;
}

export const getResidentContexts = async (): Promise<ResidentContextsResponse> => {
    const res = await api.get('/users/resident-app/contexts');
    return res.data.data;
};

export const switchResidentContext = async (
    membershipId: string
): Promise<SwitchResidentContextResponse> => {
    const res = await api.post('/users/resident-app/switch-context', { membershipId });
    return res.data.data;
};

export const getResidentRequestDetails = async (
    requestId: string
): Promise<ResidentRequestDetails> => {
    const res = await api.get(`/resident/onboarding/requests/${requestId}`);
    return res.data.data;
};

export const deleteResidentRequest = async (
    requestId: string
): Promise<{ requestId: string; status: string; deleted: boolean }> => {
    const res = await api.delete(`/resident/onboarding/requests/${requestId}`);
    return res.data.data;
};

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
