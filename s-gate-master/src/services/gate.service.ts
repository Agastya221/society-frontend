import api from './api';
import type {
    CreatePreApprovedPayload,
    DayOfWeek,
    Entry,
    EntryRequest,
    EntryRequestStatus,
    EntryStatus,
    EntryType,
    GatePass,
    GatePassStatus,
    GatePassType,
    InvitePass,
    InvitePassStatus,
    InvitePassType,
    PreApprovedDuplicateWarning,
    PreApprovedEntry,
    PreApprovedStatus,
    PreApprovedType,
    PreApprovedUsage,
    UpdatePreApprovedPayload,
} from '../types/api';

// ─── Entry Requests ───────────────────────────────────────────────────────────

export interface GetEntryRequestsParams {
    status?: EntryRequestStatus;
    flatId?: string;
    page?: number;
    limit?: number;
}

export const getEntryRequests = async (params?: GetEntryRequestsParams): Promise<EntryRequest[]> => {
    const res = await api.get('/gate/entry-requests', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.requests ?? data?.entryRequests ?? []);
};

export const approveEntryRequest = async (id: string): Promise<void> => {
    await api.patch(`/gate/entry-requests/${id}/approve`);
};

export const rejectEntryRequest = async (id: string, reason?: string): Promise<void> => {
    await api.patch(`/gate/entry-requests/${id}/reject`, reason ? { reason } : undefined);
};

export const getEntryRequestPhoto = async (id: string): Promise<{ viewUrl: string }> => {
    const res = await api.get<{ success: boolean; data: { viewUrl: string } }>(
        `/gate/entry-requests/${id}/photo`
    );
    return res.data?.data ?? { viewUrl: '' };
};

// ─── Entries ──────────────────────────────────────────────────────────────────

export interface GetEntriesParams {
    flatId?: string;
    status?: EntryStatus;
    type?: EntryType;
    page?: number;
    limit?: number;
}

export const getEntries = async (params?: GetEntriesParams): Promise<Entry[]> => {
    const res = await api.get('/gate/entries', { params });
    const data = res.data?.data;
    // Handle both { entries: [] } and bare array responses
    return Array.isArray(data) ? data : (data?.entries ?? []);
};

// ─── Invite Passes (Guest Invites) ───────────────────────────────────────────

export interface CreateInvitePassPayload {
    type: InvitePassType;
    flatId: string;
    visitorName?: string;
    visitorPhone?: string;
    validFrom: string;
    validUntil: string;
    allowedDays?: string[];
    timeFrom?: string;
    timeUntil?: string;
    maxUses?: number;
    isPrivate?: boolean;
}

/** Strip country code, spaces, dashes — always returns a plain 10-digit number */
const sanitizePhone = (phone?: string): string | undefined => {
    if (!phone) return undefined;
    // Remove spaces, dashes, parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '');
    // Strip country code: +91, 0091, or leading 0
    cleaned = cleaned.replace(/^(\+91|0091|91)/, '');
    cleaned = cleaned.replace(/^0/, '');
    return cleaned;
};

export const createInvitePass = async (data: CreateInvitePassPayload): Promise<InvitePass> => {
    const cleanData = { ...data, visitorPhone: sanitizePhone(data.visitorPhone) };
    console.log('📋 [createInvitePass] Payload being sent:', JSON.stringify(cleanData, null, 2));
    const res = await api.post<{ success: boolean; data: InvitePass }>('/gate/invites/guest', cleanData);
    return res.data.data;
};

export const getMyInvitePasses = async (status?: InvitePassStatus, type?: InvitePassType): Promise<InvitePass[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const res = await api.get<{ success: boolean; data: InvitePass[] }>('/gate/invites/guest', { params });
    return res.data.data;
};

export const getInvitePassById = async (id: string): Promise<InvitePass> => {
    const res = await api.get<{ success: boolean; data: InvitePass }>(`/gate/invites/guest/${id}`);
    return res.data.data;
};

export const revokeInvitePass = async (id: string): Promise<void> => {
    await api.delete(`/gate/invites/guest/${id}/revoke`);
};

export const deleteInvitePass = async (id: string): Promise<void> => {
    await api.delete(`/gate/invites/guest/${id}`);
};

// Static delivery companies list (no API endpoint needed)
export const DELIVERY_COMPANIES: string[] = [
    'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Blinkit',
    'BigBasket', 'Dunzo', 'Zepto', 'JioMart', 'Myntra',
];

export type PartyInviteStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface PartySlot {
    code: string;           // pre-generated 6-char alphanumeric OTP
    phone: string | null;   // null = unclaimed
    name: string | null;    // populated when resident adds manually
    addedByResident: boolean;
}

export interface PartyInvite {
    id: string;             // "grp-XXXX"
    inviteLink: string;     // "https://sgate.app/grp-XXXX"
    flatId: string;
    hostName: string;
    validFrom: string;
    validUntil: string;
    venue: string;
    theme: number;
    note: string;
    maxGuests: number;
    status: PartyInviteStatus;
    slots: PartySlot[];     // pre-generated pool
}

export interface CreatePartyInvitePayload {
    hostName: string;
    validFrom: string;
    validUntil: string;
    venue: string;
    maxGuests: number;
    theme: number;
    note: string;
}

export const createPartyInvite = async (data: CreatePartyInvitePayload): Promise<PartyInvite> => {
    const res = await api.post<{ success: boolean; data: PartyInvite }>('/gate/invites/party', data);
    return res.data.data;
};

/** Resident manually adds a guest → immediately claims a slot */
export const addPartyGuest = async (inviteId: string, name: string, phone: string): Promise<PartySlot> => {
    const cleanPhone = sanitizePhone(phone);
    const res = await api.post<{ success: boolean; data: PartySlot }>(`/gate/invites/party/${inviteId}/add-guest`, { name, phone: cleanPhone });
    return res.data.data;
};

/** Guest self-service via link → enter phone → get code (or existing if already claimed) */
export const claimPartySlot = async (inviteCode: string, phone: string): Promise<{ code: string; invite: Omit<PartyInvite, 'slots'> }> => {
    const cleanPhone = sanitizePhone(phone);
    const res = await api.post<{ success: boolean; data: { code: string; invite: Omit<PartyInvite, 'slots'> } }>(`/gate/invites/party/${inviteCode}/claim`, { phone: cleanPhone });
    return res.data.data;
};

export const getMyPartyInvites = async (): Promise<PartyInvite[]> => {
    const res = await api.get<{ success: boolean; data: PartyInvite[] }>('/gate/invites/party');
    return res.data.data;
};

export const getPartyInvite = async (inviteId: string): Promise<PartyInvite> => {
    const res = await api.get<{ success: boolean; data: PartyInvite }>(`/gate/invites/party/${inviteId}`);
    return res.data.data;
};

export const cancelPartyInvite = async (inviteId: string): Promise<void> => {
    await api.patch(`/gate/invites/party/${inviteId}/cancel`);
};

export const removePartyGuest = async (inviteId: string, code: string): Promise<void> => {
    await api.delete(`/gate/invites/party/${inviteId}/guests/${code}`);
};

// ─── Guard App Verification ───────────────────────────────────────────────────

export interface VerifyCodeResponse {
    allowed: boolean;
    reason?: string;
    inviteType?: string;
    visitorName?: string;
    flatNumber?: string;
    [key: string]: any;
}

export const verifyGuardCode = async (code: string): Promise<VerifyCodeResponse> => {
    const res = await api.post<{ success: boolean; message: string; data: VerifyCodeResponse }>('/guard-app/verify-code', { code });
    return res.data.data;
};

// ─── Deliveries ───────────────────────────────────────────────────────────────

export interface CreateExpectedDeliveryPayload {
    flatId: string;
    company: string;
    expectedDate: string;
    trackingId?: string;
}

export const getExpectedDeliveries = async (): Promise<unknown[]> => {
    try {
        const res = await api.get('/gate/deliveries/expected');
        const data = res.data?.data;
        return Array.isArray(data) ? data : (data?.deliveries ?? []);
    } catch (err: any) {
        console.warn('⚠️ [Gate Service] Expected deliveries endpoint missing or failed:', err?.response?.status);
        return []; // Suppress 404 HTML errors
    }
};

export const createExpectedDelivery = async (
    data: CreateExpectedDeliveryPayload
): Promise<unknown> => {
    const res = await api.post('/gate/deliveries/expected', data);
    return res.data.data;
};

export const getAutoApproveRules = async (): Promise<unknown[]> => {
    try {
        const res = await api.get('/gate/deliveries/auto-approve');
        const data = res.data?.data;
        return Array.isArray(data) ? data : (data?.rules ?? []);
    } catch (err: any) {
        console.warn('⚠️ [Gate Service] Auto-approve deliveries endpoint missing or failed:', err?.response?.status);
        return []; // Suppress 404 HTML errors
    }
};

export const createAutoApproveRule = async (data: {
    company: string;
    autoApprove: boolean;
}): Promise<unknown> => {
    const res = await api.post('/gate/deliveries/auto-approve', data);
    return res.data.data;
};

export const getDeliveryCompanies = async (): Promise<string[]> => {
    const res = await api.get('/gate/deliveries/companies');
    return res.data.data?.companies ?? [];
};

// ─── Pre-Approved Entries (new /api/v1/gate/pre-approved system) ─────────────

export interface GetPreApprovedListParams {
    type?: PreApprovedType;
    status?: PreApprovedStatus;
    page?: number;
    limit?: number;
}

export interface PreApprovedListResponse {
    entries: PreApprovedEntry[];
    pagination: { total: number; page: number; limit: number; pages: number };
}

/** Create a new pre-approved entry (CAB / DELIVERY / HELP). */
export const createPreApproved = async (
    data: CreatePreApprovedPayload
): Promise<PreApprovedEntry | PreApprovedDuplicateWarning> => {
    const res = await api.post<{ success: boolean; data: PreApprovedEntry | PreApprovedDuplicateWarning }>(
        '/gate/pre-approved',
        data
    );
    return res.data.data;
};

/** List all pre-approved entries for the resident's flat. */
export const getPreApprovedList = async (
    params?: GetPreApprovedListParams
): Promise<PreApprovedListResponse> => {
    const res = await api.get<{ success: boolean; data: PreApprovedListResponse }>(
        '/gate/pre-approved',
        { params }
    );
    return res.data.data;
};

/** Get a single pre-approved entry by ID. */
export const getPreApprovedById = async (id: string): Promise<PreApprovedEntry> => {
    const res = await api.get<{ success: boolean; data: PreApprovedEntry }>(`/gate/pre-approved/${id}`);
    return res.data.data;
};

/** Update an active pre-approved entry. */
export const updatePreApproved = async (
    id: string,
    data: UpdatePreApprovedPayload
): Promise<PreApprovedEntry> => {
    const res = await api.patch<{ success: boolean; data: PreApprovedEntry }>(
        `/gate/pre-approved/${id}`,
        data
    );
    return res.data.data;
};

/** Cancel an active entry. Idempotent — already-cancelled entries return as-is. */
export const cancelPreApproved = async (id: string): Promise<PreApprovedEntry> => {
    const res = await api.patch<{ success: boolean; data: PreApprovedEntry }>(
        `/gate/pre-approved/${id}/cancel`
    );
    return res.data.data;
};

/** Delete a non-ACTIVE entry (must cancel first before deleting). */
export const deletePreApproved = async (id: string): Promise<void> => {
    await api.delete(`/gate/pre-approved/${id}`);
};

/** Get a pre-filled template to repeat/recreate an old entry. Dates cleared, everything else pre-filled. */
export const getRepeatTemplate = async (id: string): Promise<Partial<CreatePreApprovedPayload>> => {
    const res = await api.get<{ success: boolean; data: Partial<CreatePreApprovedPayload> }>(
        `/gate/pre-approved/${id}/repeat`
    );
    return res.data.data;
};

/** Get paginated usage history for one pre-approved entry. */
export const getPreApprovedUsages = async (
    id: string,
    params?: { page?: number; limit?: number }
): Promise<{ usages: PreApprovedUsage[]; pagination: { total: number; page: number; limit: number; pages: number } }> => {
    const res = await api.get<{ success: boolean; data: { usages: PreApprovedUsage[]; pagination: { total: number; page: number; limit: number; pages: number } } }>(
        `/gate/pre-approved/${id}/usages`,
        { params }
    );
    return res.data.data;
};

// ─── Gate Passes ──────────────────────────────────────────────────────────────

export interface CreateGatePassPayload {
    type: GatePassType;
    flatId: string;
    subject: string;
    validFrom: string;
    validUntil: string;
    details?: string;
}

export interface GetGatePassesParams {
    status?: GatePassStatus;
    type?: GatePassType;
}

export const createGatePass = async (
    data: CreateGatePassPayload
): Promise<GatePass> => {
    const res = await api.post('/gate/passes', data);
    return res.data.data;
};

export const getGatePasses = async (
    params?: GetGatePassesParams
): Promise<GatePass[]> => {
    const res = await api.get('/gate/passes', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.passes ?? []);
};

export const getGatePassQR = async (
    id: string
): Promise<{ qrToken: string }> => {
    const res = await api.get(`/gate/passes/${id}/qr`);
    return res.data.data;
};

export const getGatePassById = async (
    id: string
): Promise<GatePass> => {
    const res = await api.get<{ success: boolean; data: GatePass }>(`/gate/passes/${id}`);
    return res.data.data;
};

export const cancelGatePass = async (id: string): Promise<void> => {
    await api.delete(`/gate/passes/${id}`);
};

// ─── Entry Pending Count / Approvals ─────────────────────────────────────────

export const getPendingEntryCount = async (): Promise<number> => {
    const res = await api.get<{ success: boolean; data: { pendingCount: number } }>(
        '/gate/requests/pending-count'
    );
    return res.data.data?.pendingCount ?? 0;
};

export const getPendingApprovals = async (): Promise<Entry[]> => {
    const res = await api.get('/gate/entries/pending');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.entries ?? []);
};

export const checkoutEntry = async (id: string): Promise<void> => {
    await api.patch(`/gate/entries/${id}/checkout`);
};

// ─── Auto-Approve Rule Management ────────────────────────────────────────────

export const toggleAutoApproveRule = async (
    id: string,
    isActive: boolean
): Promise<unknown> => {
    const res = await api.patch(`/gate/deliveries/auto-approve/${id}`, { isActive });
    return res.data.data;
};

export const deleteAutoApproveRule = async (id: string): Promise<void> => {
    await api.delete(`/gate/deliveries/auto-approve/${id}`);
};
