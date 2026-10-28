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
    email?: string | null;
    // Guards: the shift they work, whether they are on duty now and at which gate, and their last sign-in
    shift?: { name: string; startTime: string; endTime: string; graceMinutes: number } | null;
    dutyNow?: { since: string; gate: string | null } | null;
    lastLogin?: string | null;
    // Other staff: the days they work and whether they are inside the society now
    workingDays?: string[];
    insideNow?: boolean;
    lastCheckIn?: string | null;
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

/** Returns the new staff member's id so flats can be assigned right away. */
export const createDomesticStaff = async (input: StaffInput): Promise<string | undefined> => {
    const res = await api.post('/staff/domestic', input);
    return res.data?.data?.id;
};

export const updateDomesticStaff = async (
    id: string,
    input: Partial<StaffInput> & { isActive?: boolean },
): Promise<void> => {
    await api.patch(`/staff/domestic/${id}`, input);
};

export interface AssignableFlat {
    id: string;
    flatNumber: string;
    block?: { name: string } | null;
}

/** Occupied flats of the society, for picking where a staff member works. */
export const getAssignableFlats = async (): Promise<AssignableFlat[]> => {
    const flats: AssignableFlat[] = [];
    let page = 1;
    let pages = 1;
    while (page <= pages && page <= 20) {
        const res = await api.get(`/gate/flats?page=${page}&limit=100`);
        const data = res.data?.data;
        flats.push(...(data?.flats ?? []));
        pages = data?.pagination?.pages ?? 1;
        page += 1;
    }
    return flats;
};

export const assignStaffToFlat = async (domesticStaffId: string, flatId: string): Promise<void> => {
    await api.post('/staff/domestic/assignments', { domesticStaffId, flatId });
};
