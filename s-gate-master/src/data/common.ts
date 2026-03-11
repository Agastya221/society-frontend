export interface GatePass {
    id: string;
    type: 'Material' | 'Move-in' | 'Worker' | 'Guest' | 'Cab' | 'Entry' | 'Special_Access' | 'Gate_Pass'; // Extended types
    requestedBy: string; // Flat number or Resident Name
    flatNumber: string;
    validity: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    timestamp: string; // Keep for backward compatibility, mapped to createdAt for new ones

    // Unified Approval Fields
    source?: 'ADMIN' | 'GUARD' | 'RESIDENT'; // Default to GUARD if undefined
    title?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    approvedBy?: string;
    decisionAt?: string;
    rejectionReason?: string;
}

export const MOCK_GATE_PASSES: GatePass[] = [
    {
        id: 'gp1',
        type: 'Material',
        requestedBy: 'Rahul Sharma',
        flatNumber: '101',
        validity: '2023-11-20',
        status: 'Pending',
        timestamp: '10:00 AM',
        source: 'GUARD',
        description: 'Delivery of construction materials'
    },
    {
        id: 'gp2',
        type: 'Worker',
        requestedBy: 'Priya Verma',
        flatNumber: '102',
        validity: 'Today',
        status: 'Pending',
        timestamp: '11:30 AM',
        source: 'GUARD',
        description: 'Plumber for bathroom repair'
    },
    {
        id: 'gp3',
        type: 'Guest',
        requestedBy: 'Amit Patel',
        flatNumber: '201',
        validity: 'Today',
        status: 'Approved',
        timestamp: '09:15 AM',
        source: 'GUARD',
        description: 'Guest entry',
        approvedBy: 'Gate Guard'
    },
    // Admin Raised Requests (Merged)
    {
        id: 'ar1',
        source: 'ADMIN',
        type: 'Special_Access',
        requestedBy: 'Admin User',
        flatNumber: '305',
        title: 'Emergency HVAC Maintenance',
        description: 'HVAC maintenance team needs immediate access for emergency repair. Cooling system failure reported.',
        status: 'Pending',
        timestamp: '2:30 PM',
        createdAt: '2024-01-15T14:30:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        validity: 'Today'
    },
    {
        id: 'ar2',
        source: 'ADMIN',
        type: 'Entry', // Using 'Entry' for clarity
        requestedBy: 'Admin User',
        flatNumber: '102',
        title: 'Furniture Delivery Access',
        description: 'New resident moving in. Furniture delivery truck needs gate pass for 2 hours.',
        status: 'Approved',
        timestamp: '9:00 AM',
        createdAt: '2024-01-14T09:00:00Z',
        updatedAt: '2024-01-14T09:30:00Z',
        validity: 'Today',
        approvedBy: 'Senior Admin',
        decisionAt: '2024-01-14T09:30:00Z'
    }
];

// Re-export as ApprovalRequest for compatibility with existing code if needed, 
// but pointing to the same type effectively
export type ApprovalRequest = GatePass;


export interface Payment {
    id: string;
    flatNumber: string;
    amount: number;
    status: 'Paid' | 'Pending' | 'Overdue';
    dueDate: string;
    lastPaidDate?: string;
}

export const MOCK_PAYMENTS: Payment[] = [
    { id: 'p1', flatNumber: '101', amount: 5000, status: 'Paid', dueDate: '2023-11-05', lastPaidDate: '2023-11-03' },
    { id: 'p2', flatNumber: '102', amount: 5000, status: 'Pending', dueDate: '2023-11-05' },
    { id: 'p3', flatNumber: '201', amount: 5000, status: 'Overdue', dueDate: '2023-10-05' },
];

export interface EmergencyAlert {
    id: string;
    type: 'Fire' | 'Medical' | 'Security' | 'Lift_Stuck';
    flatNumber: string;
    timestamp: string;
    status: 'Active' | 'Resolved';
}

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
