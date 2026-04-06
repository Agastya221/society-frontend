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

// ── Mock Data for Preview ──────────────────────────────────────────────────
const MOCK_STAFF: StaffMember[] = [
    {
        id: 'st-01', name: 'Ramesh Singh', phone: '+91 9876543210', role: 'GUARD', status: 'ACTIVE',
        agencyName: 'SecureForce', salary: 18000, shiftStart: '08:00', shiftEnd: '20:00', assignedFlats: ['SOCIETY'], createdAt: new Date().toISOString()
    },
    {
        id: 'st-02', name: 'Sunita Devi', phone: '+91 9876543211', role: 'MAID', status: 'ACTIVE',
        salary: 12000, shiftStart: '09:00', shiftEnd: '17:00', assignedFlats: ['f-101', 'f-102', 'f-205'], createdAt: new Date().toISOString()
    },
    {
        id: 'st-03', name: 'Manish Kumar', phone: '+91 9876543212', role: 'PLUMBER', status: 'INACTIVE',
        salary: 15000, shiftStart: '10:00', shiftEnd: '18:00', assignedFlats: ['SOCIETY'], createdAt: new Date().toISOString()
    }
];

const MOCK_ATTENDANCE: StaffAttendance[] = [
    {
        id: 'att-01', staffId: 'st-01', date: new Date().toISOString().split('T')[0],
        checkInTime: new Date(Date.now() - 4 * 3600000).toISOString(), status: 'PRESENT'
    },
    {
        id: 'att-02', staffId: 'st-02', date: new Date().toISOString().split('T')[0],
        checkInTime: new Date(Date.now() - 5 * 3600000).toISOString(), checkOutTime: new Date().toISOString(), status: 'HALF_DAY'
    }
];

// ── API Functions ────────────────────────────────────────────────────────
export const getStaffList = async (): Promise<StaffMember[]> => {
    try {
        const response = await api.get<{ success: boolean; data: StaffMember[] }>('/admin/staff');
        return response.data.data;
    } catch {
        // Fallback to mock for UI development
        console.warn('Backend /admin/staff failed, using mock data.');
        return new Promise(resolve => setTimeout(() => resolve(MOCK_STAFF), 600));
    }
};

export const getStaffAttendance = async (date: string): Promise<StaffAttendance[]> => {
    try {
        const response = await api.get<{ success: boolean; data: StaffAttendance[] }>(`/admin/staff/attendance?date=${date}`);
        return response.data.data;
    } catch {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_ATTENDANCE), 400));
    }
};
