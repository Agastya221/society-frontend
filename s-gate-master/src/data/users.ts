import { User } from '../types/auth';

export const MOCK_ADMIN_PROFILE: User = {
    id: 'ADM-2024-001',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@sgate.com',
    phone: '+91 98765 43210',
    role: 'ADMIN',
    society: 'S-Gate Residency',
    societyId: 'SOC-001',
    flat: 'N/A',
    flatId: undefined,
    avatar: 'https://avatar.iran.liara.run/public/boy?username=Rajesh',
    isActive: true,
};

export const MOCK_RESIDENT_PROFILE: User = {
    id: 'RES-2024-156',
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    phone: '+91 87654 32109',
    role: 'RESIDENT',
    society: 'S-Gate Residency',
    societyId: 'SOC-001',
    flat: 'A-101',
    flatId: 'FLT-A101',
    avatar: 'https://avatar.iran.liara.run/public/girl?username=Priya',
    isActive: true,
};
