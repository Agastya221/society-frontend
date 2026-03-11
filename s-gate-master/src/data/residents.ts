export interface Resident {
    id: string;
    name: string;
    type: 'OWNER' | 'RENTER' | 'FAMILY';
    mobile: string;
    flatId: string;
    agreementUrl?: string | null; // Mandatory for RENTER
}

export const MOCK_RESIDENTS: Resident[] = [
    { id: 'r1', name: 'Rahul Sharma', type: 'OWNER', mobile: '9876543210', flatId: '1' },
    { id: 'r2', name: 'Anjali Sharma', type: 'FAMILY', mobile: '9876543211', flatId: '1' },
    { id: 'r3', name: 'Priya Verma', type: 'OWNER', mobile: '9876543212', flatId: '2' },
    // Example tenant
    { id: 'r4', name: 'John Doe', type: 'RENTER', mobile: '9876543200', flatId: '3', agreementUrl: 'file:///mock/agreement.pdf' },
];
