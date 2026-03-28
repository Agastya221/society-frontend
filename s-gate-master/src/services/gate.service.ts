import api from './api';
import type {
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
    PreApproval,
    PreApprovalStatus,
    VisitorType,
} from '../types/api';

let mockEntryRequests: EntryRequest[] = [
    {
        id: 'mock-req-1',
        type: 'DELIVERY',
        visitorName: 'Amazon Delivery',
        status: 'PENDING',
        flatId: 'flat-1',
        flat: { number: '101' },
        createdAt: new Date().toISOString()
    }
];

let mockEntries: Entry[] = [
    {
        id: 'mock-ent-1',
        type: 'VISITOR',
        visitorName: 'Alice Smith',
        status: 'CHECKED_IN',
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];

let mockPreApprovals: PreApproval[] = [
    {
        id: 'mock-pre-1',
        visitorName: 'Swiggy',
        visitorType: 'DELIVERY_PERSON',
        status: 'ACTIVE',
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        qrToken: 'dummy-qr',
        flatId: 'flat-1'
    }
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── Entry Requests ───────────────────────────────────────────────────────────

export interface GetEntryRequestsParams {
    status?: EntryRequestStatus;
    flatId?: string;
    page?: number;
    limit?: number;
}

export const getEntryRequests = async (params?: GetEntryRequestsParams): Promise<EntryRequest[]> => {
    await delay(600);
    return mockEntryRequests.filter(r => params?.status ? r.status === params.status : true);
};

export const approveEntryRequest = async (id: string): Promise<void> => {
    await delay(400);
    const req = mockEntryRequests.find(r => r.id === id);
    if (req) {
        req.status = 'APPROVED';
        mockEntries.unshift({
            id: 'mock-ent-' + Date.now(),
            type: req.type,
            visitorName: req.visitorName,
            status: 'CHECKED_IN',
            createdAt: new Date().toISOString()
        });
    }
};

export const rejectEntryRequest = async (id: string, reason?: string): Promise<void> => {
    await delay(400);
    const req = mockEntryRequests.find(r => r.id === id);
    if (req) req.status = 'REJECTED';
};

export const getEntryRequestPhoto = async (id: string): Promise<{ viewUrl: string }> => {
    await delay(200);
    return { viewUrl: '' };
};

// ─── Entries ──────────────────────────────────────────────────────────────────

export interface GetEntriesParams {
    flatId?: string;
    status?: EntryStatus;
    type?: EntryType;
    page?: number;
    limit?: number;
}

export const getPendingApprovals = async (): Promise<Entry[]> => {
    return [];
};

export const getEntries = async (params?: GetEntriesParams): Promise<Entry[]> => {
    await delay(600);
    return mockEntries;
};

// ─── Pre-Approvals ────────────────────────────────────────────────────────────

export interface CreatePreApprovalPayload {
    visitorName: string;
    visitorPhone?: string;
    flatId: string;
    validFrom: string;
    validUntil: string;
    visitorType: VisitorType;
}

export const createPreApproval = async (data: CreatePreApprovalPayload): Promise<{ id: string; qrToken: string }> => {
    await delay(600);
    return { id: 'dummy', qrToken: 'dummy' };
};

export const getMyPreApprovals = async (status?: PreApprovalStatus): Promise<PreApproval[]> => {
    await delay(600);
    return mockPreApprovals;
};

export const getPreApprovalQR = async (id: string): Promise<{ qrToken: string }> => {
    return { qrToken: '' };
};

export const cancelPreApproval = async (id: string): Promise<void> => {
    mockPreApprovals = mockPreApprovals.filter(p => p.id !== id);
};

// ─── Invite Passes (unified pre-approval system) ─────────────────────────

export interface CreateInvitePassPayload {
    type: InvitePassType;
    flatId: string;
    visitorName?: string;
    visitorPhone?: string;
    purpose?: string;
    vehicleNumber?: string;
    companyName?: string;
    companies?: string[];
    allowedDays?: string[];
    timeFrom?: string;
    timeUntil?: string;
    validFrom: string;
    validUntil: string;
    maxUses?: number;
    isPrivate?: boolean;
    safePickup?: boolean;
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
    await api.patch(`/gate/invites/guest/${id}/revoke`);
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
    const res = await api.get('/gate/deliveries/expected');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.deliveries ?? []);
};

export const createExpectedDelivery = async (
    data: CreateExpectedDeliveryPayload
): Promise<unknown> => {
    const res = await api.post('/gate/deliveries/expected', data);
    return res.data.data;
};

export const getAutoApproveRules = async (): Promise<unknown[]> => {
    const res = await api.get('/gate/deliveries/auto-approve');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.rules ?? []);
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
