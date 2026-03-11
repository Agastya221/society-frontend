import { GatePass } from './types';

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

export const MOCK_GATE_PASSES: GatePass[] = [
    {
        id: 'gp_1',
        type: 'GUEST',
        title: 'Mom & Dad',
        description: 'Parents visiting for the weekend',
        validFrom: now.toISOString(),
        validTo: tomorrow.toISOString(),
        status: 'APPROVED',
        code: 'GP-123456',
        createdAt: now.toISOString(),
    },
    {
        id: 'gp_2',
        type: 'WORKER',
        title: 'Plumber',
        description: 'Fixing kitchen sink',
        validFrom: now.toISOString(),
        validTo: now.toISOString(), // Expiring same day
        status: 'PENDING',
        code: 'GP-987654',
        createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
    }
];
