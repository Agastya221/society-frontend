export type GuardStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface GuardShift {
    id: string;
    startTime: string; // e.g. "08:00 AM"
    endTime: string;   // e.g. "04:00 PM"
    assignedBy: string; // Admin ID/Name
    assignedAt: string; // ISO
}

export interface Guard {
    id: string;
    name: string;
    mobile: string;
    gateId: string; // Linked to Gate ID
    status: GuardStatus;
    aadhaarUrl: string | null; // Local file URI mock
    shiftVal: string; // Display string for now, enhancing later if needed
    shifts: GuardShift[];
    profileImage?: string;
}

export const MOCK_GUARDS: Guard[] = [
    {
        id: 'g1',
        name: 'Ram Kumar',
        gateId: '1',
        status: 'ACTIVE',
        shiftVal: '08:00 AM - 04:00 PM',
        mobile: '9988776655',
        aadhaarUrl: 'file:///mock/aadhaar/g1.jpg',
        shifts: []
    },
    {
        id: 'g2',
        name: 'Shyam Singh',
        gateId: '2',
        status: 'ACTIVE',
        shiftVal: '04:00 PM - 12:00 AM',
        mobile: '9988776644',
        aadhaarUrl: 'file:///mock/aadhaar/g2.jpg',
        shifts: []
    },
    {
        id: 'g3',
        name: 'Mohan Lal',
        gateId: '1',
        status: 'SUSPENDED', // Example of non-active
        shiftVal: '12:00 AM - 08:00 AM',
        mobile: '9988776633',
        aadhaarUrl: 'file:///mock/aadhaar/g3.jpg',
        shifts: []
    },
];
