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
    PreApproval,
    PreApprovalStatus,
    VisitorType,
} from '../types/api';

// ─── Entry Requests ───────────────────────────────────────────────────────────

export interface GetEntryRequestsParams {
    status?: EntryRequestStatus;
    flatId?: string;
    page?: number;
    limit?: number;
}

export const getEntryRequests = async (
    params?: GetEntryRequestsParams
): Promise<EntryRequest[]> => {
    const res = await api.get('/gate/requests', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.entries ?? []);
};

export const approveEntryRequest = async (id: string): Promise<void> => {
    await api.patch(`/gate/requests/${id}/approve`);
};

export const rejectEntryRequest = async (
    id: string,
    reason?: string
): Promise<void> => {
    await api.patch(`/gate/requests/${id}/reject`, { reason });
};

export const getEntryRequestPhoto = async (
    id: string
): Promise<{ viewUrl: string }> => {
    const res = await api.get(`/gate/requests/${id}/photo`);
    return res.data.data;
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
    const res = await api.get('/gate/entries/pending');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.entries ?? []);
};

export const getEntries = async (params?: GetEntriesParams): Promise<Entry[]> => {
    const res = await api.get('/gate/entries', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.entries ?? []);
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

export const createPreApproval = async (
    data: CreatePreApprovalPayload
): Promise<{ id: string; qrToken: string }> => {
    const res = await api.post('/gate/', data);
    return res.data.data;
};

export const getMyPreApprovals = async (
    status?: PreApprovalStatus
): Promise<PreApproval[]> => {
    const res = await api.get('/gate/', { params: status ? { status } : undefined });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.preApprovals ?? []);
};

export const getPreApprovalQR = async (
    id: string
): Promise<{ qrToken: string; qrCodeImage: string }> => {
    const res = await api.get(`/gate/${id}/qr`);
    return res.data.data;
};

export const cancelPreApproval = async (id: string): Promise<void> => {
    await api.delete(`/gate/${id}`);
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
