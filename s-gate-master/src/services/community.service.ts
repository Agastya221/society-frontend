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
    reportedBy?: { id: string; name: string };
    respondedAt?: string;
    resolvedAt?: string;
    notes?: string;
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

export const getAllEmergencies = async (status?: string): Promise<Emergency[]> => {
    const res = await api.get('/community/emergencies', { params: status ? { status } : undefined });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.emergencies ?? []);
};

export const getActiveEmergencies = async (): Promise<Emergency[]> => {
    const res = await api.get('/community/emergencies/active');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.emergencies ?? []);
};

export const getEmergencyById = async (id: string): Promise<Emergency> => {
    const res = await api.get<{ success: boolean; data: Emergency }>(`/community/emergencies/${id}`);
    return res.data.data;
};

export const respondToEmergency = async (id: string): Promise<Emergency> => {
    const res = await api.patch<{ success: boolean; data: Emergency }>(`/community/emergencies/${id}/respond`);
    return res.data.data;
};

export const resolveEmergency = async (id: string, notes?: string): Promise<Emergency> => {
    const res = await api.patch<{ success: boolean; data: Emergency }>(
        `/community/emergencies/${id}/resolve`,
        notes ? { notes } : undefined
    );
    return res.data.data;
};

export const markEmergencyFalseAlarm = async (id: string, notes?: string): Promise<Emergency> => {
    const res = await api.patch<{ success: boolean; data: Emergency }>(
        `/community/emergencies/${id}/false-alarm`,
        notes ? { notes } : undefined
    );
    return res.data.data;
};

// ─── Notices ──────────────────────────────────────────────────────────────────

export interface GetNoticesParams {
    page?: number;
    limit?: number;
}

export interface CreateNoticePayload {
    title: string;
    content: string;
    type: 'GENERAL' | 'URGENT' | 'EVENT' | 'MAINTENANCE' | 'MEETING' | 'EMERGENCY';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    attachments?: string[];
}

export const getNotices = async (params?: GetNoticesParams): Promise<Notice[]> => {
    const res = await api.get('/community/notices', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.notices ?? []);
};

export const getNoticeById = async (id: string): Promise<Notice> => {
    const res = await api.get<{ success: boolean; data: Notice }>(`/community/notices/${id}`);
    return res.data.data;
};

export const createNotice = async (data: CreateNoticePayload): Promise<Notice> => {
    const res = await api.post<{ success: boolean; data: Notice }>('/community/notices', data);
    return res.data.data;
};

export const updateNotice = async (id: string, data: Partial<CreateNoticePayload>): Promise<Notice> => {
    const res = await api.patch<{ success: boolean; data: Notice }>(`/community/notices/${id}`, data);
    return res.data.data;
};

export const deleteNotice = async (id: string): Promise<void> => {
    await api.delete(`/community/notices/${id}`);
};

export const togglePinNotice = async (id: string): Promise<Notice> => {
    const res = await api.patch<{ success: boolean; data: Notice }>(`/community/notices/${id}/toggle-pin`);
    return res.data.data;
};

// ─── Amenities ────────────────────────────────────────────────────────────────

export interface Amenity {
    id: string;
    name: string;
    type: string;
    capacity?: number;
    hourlyRate?: number;
    description?: string;
    rules?: string;
    timings?: string;
    isActive?: boolean;
}

export interface CreateAmenityPayload {
    name: string;
    type: 'CLUBHOUSE' | 'GYM' | 'SWIMMING_POOL' | 'PARTY_HALL' | 'SPORTS_COURT' | 'BANQUET_HALL' | 'GARDEN' | 'OTHER';
    capacity?: number;
    hourlyRate?: number;
    description?: string;
    rules?: string;
}

export const getAmenities = async (): Promise<Amenity[]> => {
    const res = await api.get('/community/amenities');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.amenities ?? []);
};

export const getAmenityById = async (id: string): Promise<Amenity> => {
    const res = await api.get<{ success: boolean; data: Amenity }>(`/community/amenities/${id}`);
    return res.data.data;
};

export const createAmenity = async (data: CreateAmenityPayload): Promise<Amenity> => {
    const res = await api.post<{ success: boolean; data: Amenity }>('/community/amenities', data);
    return res.data.data;
};

export const updateAmenity = async (id: string, data: Partial<CreateAmenityPayload>): Promise<Amenity> => {
    const res = await api.patch<{ success: boolean; data: Amenity }>(`/community/amenities/${id}`, data);
    return res.data.data;
};

export const deleteAmenity = async (id: string): Promise<void> => {
    await api.delete(`/community/amenities/${id}`);
};

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface Booking {
    id: string;
    amenityId: string;
    amenity?: Amenity;
    fromDate: string;
    toDate: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
    createdAt: string;
    cancelReason?: string;
}

export interface GetBookingsParams {
    amenityId?: string;
    status?: string;
}

export interface CreateBookingPayload {
    amenityId: string;
    fromDate: string;
    toDate: string;
}

export const getBookings = async (params?: GetBookingsParams): Promise<Booking[]> => {
    const res = await api.get('/community/bookings', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.bookings ?? []);
};

export const createBooking = async (data: CreateBookingPayload): Promise<Booking> => {
    const res = await api.post<{ success: boolean; data: Booking }>('/community/bookings', data);
    return res.data.data;
};

export const approveBooking = async (id: string): Promise<Booking> => {
    const res = await api.patch<{ success: boolean; data: Booking }>(`/community/bookings/${id}/approve`);
    return res.data.data;
};

export const cancelBooking = async (id: string, reason?: string): Promise<Booking> => {
    const res = await api.patch<{ success: boolean; data: Booking }>(
        `/community/bookings/${id}/cancel`,
        reason ? { reason } : undefined
    );
    return res.data.data;
};

// ─── Complaints (admin actions) ───────────────────────────────────────────────

export const resolveComplaint = async (id: string, resolution: string): Promise<void> => {
    await api.patch(`/community/complaints/${id}/resolve`, { resolution });
};

export const assignComplaint = async (id: string, assignedToId: string): Promise<void> => {
    await api.patch(`/community/complaints/${id}/assign`, { assignedToId });
};

export const updateComplaintStatus = async (
    id: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
): Promise<void> => {
    await api.patch(`/community/complaints/${id}/status`, { status });
};
