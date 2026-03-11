export type GatePassType = 'Guest' | 'Delivery' | 'Worker' | 'Cab';
export type GatePassStatus = 'Pending' | 'Approved' | 'Rejected';

export interface GatePass {
    id: string;
    type: GatePassType;
    title: string;          // Visitor Name
    description: string;    // Flat / Notes
    requestedBy: string;    // Guard Name
    flatNumber: string;
    status: GatePassStatus;
    source: 'GUARD';
    createdAt: string;      // ISO String
    updatedAt?: string;
    decisionAt?: string;
    rejectionReason?: string;
}
