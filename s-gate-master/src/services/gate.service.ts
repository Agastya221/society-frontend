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

export const getPreApprovalQR = async (id: string): Promise<{ qrToken: string; qrCodeImage: string }> => {
    return { qrToken: '', qrCodeImage: '' };
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
    const res = await api.post('/gate/invites/guest', cleanData);
    const pass = res.data.data;
    
    // Convert to the old type for the mock home screen UI so it doesn't break
    const newPass: PreApproval = {
        id: pass.id,
        visitorName: pass.visitorName || 'Guest',
        visitorType: pass.type === 'QUICK' ? 'GUEST' : 'OTHER',
        status: 'ACTIVE',
        validFrom: pass.validFrom,
        validUntil: pass.validUntil,
        qrToken: pass.passcode || 'fallback',
        flatId: data.flatId
    };
    mockPreApprovals.unshift(newPass);

    return pass;
};

export const getMyInvitePasses = async (status?: InvitePassStatus): Promise<InvitePass[]> => {
    await delay(300);
    return [];
};

export const getInvitePassById = async (id: string): Promise<InvitePass> => {
    const res = await api.get(`/gate/invites/${id}`);
    return res.data.data;
};

export const cancelInvitePass = async (id: string): Promise<void> => {
    await api.patch(`/gate/invites/${id}/cancel`);
};

// Static delivery companies list (no API endpoint needed)
export const DELIVERY_COMPANIES: string[] = [
    'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Blinkit',
    'BigBasket', 'Dunzo', 'Zepto', 'JioMart', 'Myntra',
];

// ─── Party / Group Invite ─────────────────────────────────────────────────────

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
    slots: PartySlot[];     // pre-generated pool
}

// In-memory store for demo
const mockPartyInvites: Map<string, PartyInvite> = new Map();

function genCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface CreatePartyInvitePayload {
    flatId: string;
    hostName: string;
    validFrom: string;
    validUntil: string;
    venue: string;
    maxGuests: number;
    theme: number;
    note: string;
}

export const createPartyInvite = async (data: CreatePartyInvitePayload): Promise<PartyInvite> => {
    await delay(700);
    const id = 'grp-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const slots: PartySlot[] = Array.from({ length: data.maxGuests }, () => ({
        code: genCode(), phone: null, name: null, addedByResident: false,
    }));
    const invite: PartyInvite = {
        id, inviteLink: `https://sgate.app/${id}`,
        ...data, slots,
    };
    mockPartyInvites.set(id, invite);
    return invite;
};

/** Resident manually adds a guest → immediately claims a slot */
export const addPartyGuest = async (inviteId: string, name: string, phone: string): Promise<PartySlot> => {
    await delay(400);
    const invite = mockPartyInvites.get(inviteId);
    if (!invite) throw new Error('Invite not found');
    const freeSlot = invite.slots.find(s => s.phone === null);
    if (!freeSlot) throw new Error('No slots remaining');
    freeSlot.phone = phone;
    freeSlot.name = name;
    freeSlot.addedByResident = true;
    return freeSlot;
};

/** Guest self-service via link → enter phone → get code (or existing if already claimed) */
export const claimPartySlot = async (inviteId: string, phone: string): Promise<{ code: string; invite: Omit<PartyInvite, 'slots'> }> => {
    await delay(500);
    const invite = mockPartyInvites.get(inviteId);
    if (!invite) throw new Error('Invite not found');
    // Already claimed by this phone?
    const existing = invite.slots.find(s => s.phone === phone);
    if (existing) return { code: existing.code, invite };
    const free = invite.slots.find(s => s.phone === null);
    if (!free) throw new Error('This invite is full');
    free.phone = phone;
    return { code: free.code, invite };
};

export const getPartyInvite = async (inviteId: string): Promise<PartyInvite> => {
    await delay(300);
    const invite = mockPartyInvites.get(inviteId);
    if (!invite) throw new Error('Invite not found');
    return invite;
};

export const removePartyGuest = async (inviteId: string, code: string): Promise<void> => {
    await delay(300);
    const invite = mockPartyInvites.get(inviteId);
    if (!invite) return;
    const slot = invite.slots.find(s => s.code === code);
    if (slot) { slot.phone = null; slot.name = null; slot.addedByResident = false; }
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
): Promise<{ qrToken: string; qrCodeImage: string }> => {
    const res = await api.get(`/gate/passes/${id}/qr`);
    return res.data.data;
};
