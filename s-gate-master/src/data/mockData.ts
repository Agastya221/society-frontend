export interface Flat {
    id: string;
    number: string;
    block: string;
    ownerName: string;
    residentsCount: number;
    vehiclesCount: number;
}

export interface Resident {
    id: string;
    name: string;
    type: 'Owner' | 'Tenant' | 'Family';
    mobile: string;
    flatId: string;
}

export interface Guard {
    id: string;
    name: string;
    gate: string;
    status: 'Active' | 'Inactive';
    shift: 'Morning' | 'Night';
    mobile: string;
}

export interface GatePass {
    id: string;
    type: 'Material' | 'Move-in' | 'Worker' | 'Guest' | 'Cab';
    requestedBy: string; // Flat number or Resident Name
    flatNumber: string;
    validity: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    timestamp: string;
    source?: 'GUARD' | 'RESIDENT' | 'ADMIN';
    title?: string;
    description?: string;
    decisionAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
}

export interface Notice {
    id: string;
    title: string;
    description: string;
    date: string;
    priority: 'Low' | 'Medium' | 'High';
    target: 'All' | 'Residents' | 'Guards';
}

export interface Payment {
    id: string;
    flatNumber: string;
    amount: number;
    status: 'Paid' | 'Pending' | 'Overdue';
    dueDate: string;
    lastPaidDate?: string;
}

export interface EmergencyAlert {
    id: string;
    type: 'Fire' | 'Medical' | 'Security' | 'Lift_Stuck';
    flatNumber: string;
    timestamp: string;
    status: 'Active' | 'Resolved';
}

export const MOCK_FLATS: Flat[] = [
    { id: '1', number: '101', block: 'A', ownerName: 'Rahul Sharma', residentsCount: 3, vehiclesCount: 1 },
    { id: '2', number: '102', block: 'A', ownerName: 'Priya Verma', residentsCount: 2, vehiclesCount: 1 },
    { id: '3', number: '201', block: 'B', ownerName: 'Amit Patel', residentsCount: 4, vehiclesCount: 2 },
    { id: '4', number: '305', block: 'C', ownerName: 'Sneha Gupta', residentsCount: 1, vehiclesCount: 0 },
    { id: '5', number: '402', block: 'D', ownerName: 'Vikram Singh', residentsCount: 5, vehiclesCount: 2 },
];

export const MOCK_RESIDENTS: Resident[] = [
    { id: 'r1', name: 'Rahul Sharma', type: 'Owner', mobile: '9876543210', flatId: '1' },
    { id: 'r2', name: 'Anjali Sharma', type: 'Family', mobile: '9876543211', flatId: '1' },
    { id: 'r3', name: 'Priya Verma', type: 'Owner', mobile: '9876543212', flatId: '2' },
];

export const MOCK_GUARDS: Guard[] = [
    { id: 'g1', name: 'Ram Kumar', gate: 'Main Gate', status: 'Active', shift: 'Morning', mobile: '9988776655' },
    { id: 'g2', name: 'Shyam Singh', gate: 'Back Gate', status: 'Active', shift: 'Night', mobile: '9988776644' },
    { id: 'g3', name: 'Mohan Lal', gate: 'Main Gate', status: 'Inactive', shift: 'Morning', mobile: '9988776633' },
];

export const MOCK_GATE_PASSES: GatePass[] = [
    { id: 'gp1', type: 'Material', requestedBy: 'Rahul Sharma', flatNumber: '101', validity: '2023-11-20', status: 'Pending', timestamp: '10:00 AM', source: 'GUARD', title: 'Cement Bags' },
    { id: 'gp2', type: 'Worker', requestedBy: 'Priya Verma', flatNumber: '102', validity: 'Today', status: 'Pending', timestamp: '11:30 AM', source: 'RESIDENT', description: 'Plumber for kitchen sink repair' },
    { id: 'gp3', type: 'Guest', requestedBy: 'Amit Patel', flatNumber: '201', validity: 'Today', status: 'Approved', timestamp: '09:15 AM', source: 'RESIDENT', decisionAt: '2023-11-23T09:20:00Z', approvedBy: 'ADMIN' },
];

export const MOCK_NOTICES: Notice[] = [
    { id: 'n1', title: 'Lift Maintenance', description: 'Lift A will be under maintenance tomorrow from 10 AM to 2 PM.', date: '2023-11-19', priority: 'High', target: 'Residents' },
    { id: 'n2', title: 'Diwali Celebration', description: 'Join us for Diwali celebration in the community hall at 7 PM.', date: '2023-11-10', priority: 'Medium', target: 'All' },
];

export const MOCK_PAYMENTS: Payment[] = [
    { id: 'p1', flatNumber: '101', amount: 5000, status: 'Paid', dueDate: '2023-11-05', lastPaidDate: '2023-11-03' },
    { id: 'p2', flatNumber: '102', amount: 5000, status: 'Pending', dueDate: '2023-11-05' },
    { id: 'p3', flatNumber: '201', amount: 5000, status: 'Overdue', dueDate: '2023-10-05' },
];

export const MOCK_ALERTS: EmergencyAlert[] = [
    { id: 'e1', type: 'Fire', flatNumber: '305', timestamp: '1 min ago', status: 'Active' },
];

export const SOCIETY_STATS = {
    totalFlats: 120,
    totalResidents: 350,
    activeGuards: 8,
    entriesToday: 45,
    pendingPayments: 12,
};
