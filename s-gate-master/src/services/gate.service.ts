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

export const createInvitePass = async (data: CreateInvitePassPayload): Promise<InvitePass> => {
    await delay(800);
    
    // Add to PreApprovals list for the home screen to show
    const newPass: PreApproval = {
        id: 'mock-pass-' + Date.now(),
        visitorName: data.visitorName || data.companyName || data.type,
        visitorType: data.type === 'GUEST' ? 'GUEST' : 'DELIVERY_PERSON',
        status: 'ACTIVE',
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        qrToken: 'dummy-qr-' + Date.now(),
        flatId: data.flatId
    };
    mockPreApprovals.unshift(newPass);

    return newPass as any;
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
