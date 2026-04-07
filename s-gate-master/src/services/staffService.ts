import axios from 'axios';
import api from './api';

export type StaffRole = 'MAID' | 'COOK' | 'PLUMBER' | 'ELECTRICIAN' | 'GUARD' | 'GARDENER' | 'OTHER';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface StaffMember {
    id: string;
    name: string;
    phone: string;
    role: StaffRole;
    status: StaffStatus;
    agencyName?: string;
    salary: number; // monthly salary for payroll
    shiftStart: string; // e.g., '09:00'
    shiftEnd: string; // e.g., '18:00'
    assignedFlats: string[]; // flat IDs they serve (or 'SOCIETY' if common)
    photoUrl?: string;
    createdAt: string;
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
