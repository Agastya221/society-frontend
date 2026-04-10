/**
 * staffDomesticService.ts
 *
 * Full resident-side client for the /staff/domestic/* API group.
 * Covers: CRUD, QR code, availability, assignments, attendance, bookings, reviews.
 */

import api from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StaffType =
    | 'MAID'
    | 'COOK'
    | 'NANNY'
    | 'DRIVER'
    | 'CLEANER'
    | 'GARDENER'
    | 'LAUNDRY'
    | 'CARETAKER'
    | 'SECURITY_GUARD'
    | 'OTHER';

export type StaffAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'INACTIVE';

export type DayOfWeek =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

export interface DomesticStaff {
    id: string;
    name: string;
    phone: string;
    staffType: StaffType;
    email?: string;
    photoUrl?: string;
    isVerified: boolean;
    overallRating?: number;
    availabilityStatus: StaffAvailabilityStatus;
    status: 'INSIDE' | 'OUTSIDE';
    lastCheckIn?: string;
    societyId?: string;
    createdAt: string;
}

export interface StaffAssignment {
    id: string;
    staffId: string;
    flatId: string;
    type: string;
    days: DayOfWeek[];
    startTime: string;
    endTime: string;
    isActive: boolean;
}

export interface StaffAttendanceRecord {
    id: string;
    staffId: string;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
}

export interface StaffBooking {
    id: string;
    staffId: string;
    flatId: string;
    date: string;
    startTime: string;
    endTime: string;
    taskDescription?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    rejectionReason?: string;
    actualDuration?: number;
    finalCost?: number;
}

export interface StaffReview {
    id: string;
    staffId: string;
    rating: number;
    comment?: string;
    createdAt: string;
    reviewer?: { id: string; name: string };
}

export interface StaffQRCodeResponse {
    staffId: string;
    name: string;
    qrToken: string;
    qrCodeImage: string;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export interface GetStaffParams {
    staffType?: StaffType;
    page?: number;
    limit?: number;
}

export interface AddStaffPayload {
    name: string;
    phone: string;
    staffType: StaffType;
    email?: string;
}

export const getStaffList = async (params?: GetStaffParams): Promise<DomesticStaff[]> => {
    const res = await api.get('/staff/domestic', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.staff ?? []);
};

export const getAvailableStaff = async (): Promise<DomesticStaff[]> => {
    const res = await api.get('/staff/domestic/available');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.staff ?? []);
};

export const getStaffById = async (id: string): Promise<DomesticStaff> => {
    const res = await api.get<{ success: boolean; data: DomesticStaff }>(`/staff/domestic/${id}`);
    return res.data.data;
};

export const addStaff = async (data: AddStaffPayload): Promise<DomesticStaff> => {
    const res = await api.post<{ success: boolean; data: DomesticStaff }>('/staff/domestic', data);
    return res.data.data;
};

export const updateStaff = async (
    id: string,
    data: Partial<AddStaffPayload>
): Promise<DomesticStaff> => {
    const res = await api.patch<{ success: boolean; data: DomesticStaff }>(`/staff/domestic/${id}`, data);
    return res.data.data;
};

export const deleteStaff = async (id: string): Promise<void> => {
    await api.delete(`/staff/domestic/${id}`);
};

export const verifyStaff = async (id: string): Promise<DomesticStaff> => {
    const res = await api.patch<{ success: boolean; data: DomesticStaff }>(`/staff/domestic/${id}/verify`);
    return res.data.data;
};

// ─── QR Code ─────────────────────────────────────────────────────────────────

export const getStaffQRCode = async (id: string): Promise<StaffQRCodeResponse> => {
    const res = await api.get<{ success: boolean; data: StaffQRCodeResponse }>(
        `/staff/domestic/${id}/qr`
    );
    return res.data.data;
};

// ─── Availability ─────────────────────────────────────────────────────────────

export const updateStaffAvailability = async (
    id: string,
    status: StaffAvailabilityStatus
): Promise<DomesticStaff> => {
    const res = await api.patch<{ success: boolean; data: DomesticStaff }>(
        `/staff/domestic/${id}/availability`,
        { status }
    );
    return res.data.data;
};

// ─── Assignments ──────────────────────────────────────────────────────────────

export interface CreateAssignmentPayload {
    staffId: string;
    flatId: string;
    type: string;
    days: DayOfWeek[];
    startTime: string;
    endTime: string;
}

export const getStaffAssignments = async (staffId: string): Promise<StaffAssignment[]> => {
    const res = await api.get(`/staff/domestic/${staffId}/assignments`);
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.assignments ?? []);
};

export const createAssignment = async (
    data: CreateAssignmentPayload
): Promise<StaffAssignment> => {
    const res = await api.post<{ success: boolean; data: StaffAssignment }>(
        '/staff/domestic/assignments',
        data
    );
    return res.data.data;
};

export const updateAssignment = async (
    id: string,
    data: Partial<CreateAssignmentPayload>
): Promise<StaffAssignment> => {
    const res = await api.patch<{ success: boolean; data: StaffAssignment }>(
        `/staff/domestic/assignments/${id}`,
        data
    );
    return res.data.data;
};

export const removeAssignment = async (id: string): Promise<void> => {
    await api.delete(`/staff/domestic/assignments/${id}`);
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface GetAttendanceParams {
    staffId?: string;
    page?: number;
    limit?: number;
}

export const checkInStaff = async (staffId: string, flatId: string): Promise<void> => {
    await api.post('/staff/domestic/check-in', { staffId, flatId });
};

export const checkOutStaff = async (
    staffId: string,
    workCompleted: boolean = true
): Promise<void> => {
    await api.post(`/staff/domestic/${staffId}/check-out`, { workCompleted });
};

export const scanStaffQR = async (
    qrToken: string,
    flatId: string,
    societyId: string
): Promise<unknown> => {
    const res = await api.post('/staff/domestic/scan', { qrToken, flatId, societyId });
    return res.data.data;
};

export const getAttendanceRecords = async (
    params?: GetAttendanceParams
): Promise<StaffAttendanceRecord[]> => {
    const res = await api.get('/staff/domestic/attendance/records', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.records ?? []);
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface CreateStaffBookingPayload {
    staffId: string;
    flatId: string;
    date: string;
    startTime: string;
    endTime: string;
    taskDescription?: string;
}

export const bookStaff = async (data: CreateStaffBookingPayload): Promise<StaffBooking> => {
    const res = await api.post<{ success: boolean; data: StaffBooking }>(
        '/staff/domestic/bookings',
        data
    );
    return res.data.data;
};

export const getStaffBookings = async (): Promise<StaffBooking[]> => {
    const res = await api.get('/staff/domestic/bookings/list');
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.bookings ?? []);
};

export const acceptBooking = async (id: string): Promise<StaffBooking> => {
    const res = await api.patch<{ success: boolean; data: StaffBooking }>(
        `/staff/domestic/bookings/${id}/accept`
    );
    return res.data.data;
};

export const rejectBooking = async (id: string, rejectionReason?: string): Promise<StaffBooking> => {
    const res = await api.patch<{ success: boolean; data: StaffBooking }>(
        `/staff/domestic/bookings/${id}/reject`,
        rejectionReason ? { rejectionReason } : undefined
    );
    return res.data.data;
};

export const completeBooking = async (
    id: string,
    actualDuration?: number,
    finalCost?: number
): Promise<StaffBooking> => {
    const res = await api.patch<{ success: boolean; data: StaffBooking }>(
        `/staff/domestic/bookings/${id}/complete`,
        { actualDuration, finalCost }
    );
    return res.data.data;
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getStaffReviews = async (staffId: string): Promise<StaffReview[]> => {
    const res = await api.get(`/staff/domestic/${staffId}/reviews`);
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.reviews ?? []);
};

export const addStaffReview = async (
    staffId: string,
    rating: number,
    comment?: string
): Promise<StaffReview> => {
    const res = await api.post<{ success: boolean; data: StaffReview }>(
        '/staff/domestic/reviews',
        { staffId, rating, comment }
    );
    return res.data.data;
};
