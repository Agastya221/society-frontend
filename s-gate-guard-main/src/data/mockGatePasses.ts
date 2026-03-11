import { GatePass } from '@/types/gatePass';

const NOW = new Date().toISOString();

export const MOCK_GATE_PASSES: GatePass[] = [
    {
        id: '1',
        type: 'Guest',
        title: 'John Doe',
        description: 'Visiting flat 101',
        requestedBy: 'Guard RAM',
        flatNumber: '101',
        status: 'Pending',
        source: 'GUARD',
        createdAt: NOW,
        updatedAt: NOW,
    },
    {
        id: '2',
        type: 'Delivery',
        title: 'Amazon Delivery',
        description: 'Package for 402',
        requestedBy: 'Guard SHAM',
        flatNumber: '402',
        status: 'Approved',
        source: 'GUARD',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3500000).toISOString(),
        decisionAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
        id: '3',
        type: 'Cab',
        title: 'Uber Driver',
        description: 'Pickup for 505',
        requestedBy: 'Guard RAM',
        flatNumber: '505',
        status: 'Rejected',
        source: 'GUARD',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7100000).toISOString(),
        decisionAt: new Date(Date.now() - 7100000).toISOString(),
        rejectionReason: 'Resident not available',
    },
];

export const addGatePass = (pass: GatePass) => {
    MOCK_GATE_PASSES.unshift(pass);
};

export const getGatePasses = () => {
    return MOCK_GATE_PASSES;
};
