import api from './api';
import type { EmergencyType, Notice } from '../types/api';

// ─── Emergencies ──────────────────────────────────────────────────────────────

export interface CreateEmergencyPayload {
    type: EmergencyType;
    description: string;
    location?: string;
}

export interface Emergency {
    id: string;
    type: EmergencyType;
    status: string;
    description: string;
    location?: string;
    createdAt: string;
}

export const createEmergency = async (
    data: CreateEmergencyPayload
): Promise<Emergency> => {
    const res = await api.post('/community/emergencies', data);
    return res.data.data;
};

export const getMyEmergencies = async (): Promise<Emergency[]> => {
    const res = await api.get('/community/emergencies/my');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.emergencies ?? []);
};

// ─── Notices ──────────────────────────────────────────────────────────────────

export interface GetNoticesParams {
    page?: number;
    limit?: number;
}

export const getNotices = async (params?: GetNoticesParams): Promise<Notice[]> => {
    const res = await api.get('/community/notices', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.notices ?? []);
};
