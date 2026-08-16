import api from './api';

export type DomesticStaffRole = 'MAID' | 'COOK' | 'NANNY' | 'DRIVER' | 'CLEANER' | 'GARDENER' | 'LAUNDRY' | 'CARETAKER' | 'SECURITY_GUARD' | 'OTHER';
export type StaffRole = DomesticStaffRole | 'GUARD';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface StaffMember {
    id: string;
    name: string;
    phone: string;
    role: StaffRole;
    status: StaffStatus;
    agencyName?: string;
    salary: number | null; // monthly salary for payroll
    shiftStart: string | null; // e.g., '09:00'
    shiftEnd: string | null; // e.g., '18:00'
    assignedFlats: string[]; // flat IDs they serve (or 'SOCIETY' if common)
    photoUrl?: string;
    source?: 'USER' | 'DOMESTIC';
    isVerified?: boolean;
    createdAt: string;
}

export interface StaffInput {
    name: string;
    phone: string;
    photoUrl: string;
    staffType: DomesticStaffRole;
}

export interface StaffAttendance {
    id: string;
    staffId: string;
    date: string; // YYYY-MM-DD
    checkInTime: string; // ISO
    checkOutTime?: string; // ISO
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
}

// ── API Functions ────────────────────────────────────────────────────────
export const getStaffList = async (): Promise<StaffMember[]> => {
    const response = await api.get<{ success: boolean; data: StaffMember[] }>('/admin/staff');
    return response.data.data;
};

export const getStaffAttendance = async (date: string): Promise<StaffAttendance[]> => {
    const response = await api.get<{ success: boolean; data: StaffAttendance[] }>(`/admin/staff/attendance?date=${date}`);
    return response.data.data;
};

export const createDomesticStaff = async (input: StaffInput): Promise<void> => {
    await api.post('/staff/domestic', input);
};

export const updateDomesticStaff = async (
    id: string,
    input: Partial<StaffInput> & { isActive?: boolean },
): Promise<void> => {
    await api.patch(`/staff/domestic/${id}`, input);
};
