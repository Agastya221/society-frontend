export interface Notice {
    id: string;
    title: string;
    description: string;
    date: string; // Display date
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    type: 'NOTICE' | 'ANNOUNCEMENT';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    target: 'All' | 'Residents' | 'Guards';
}

export const MOCK_NOTICES: Notice[] = [
    {
        id: 'n1',
        title: 'Lift Maintenance',
        description: 'Lift A will be under maintenance tomorrow from 10 AM to 2 PM.',
        date: '2023-11-19',
        createdAt: new Date('2023-11-18T10:00:00').toISOString(),
        updatedAt: new Date('2023-11-18T10:00:00').toISOString(),
        type: 'NOTICE',
        priority: 'HIGH',
        target: 'Residents'
    },
    {
        id: 'n2',
        title: 'Diwali Celebration',
        description: 'Join us for Diwali celebration in the community hall at 7 PM.',
        date: '2023-11-10',
        createdAt: new Date('2023-11-01T09:00:00').toISOString(),
        updatedAt: new Date('2023-11-01T09:00:00').toISOString(),
        type: 'ANNOUNCEMENT',
        priority: 'MEDIUM',
        target: 'All'
    },
];
