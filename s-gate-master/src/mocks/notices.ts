import { Notice } from './types';

const now = new Date();

export const MOCK_NOTICES: Notice[] = [
    {
        id: 'n_1',
        title: 'Water Supply Maintenance',
        content: 'Water supply will be suspended tomorrow from 10 AM to 2 PM for maintenance.',
        priority: 'HIGH',
        isPinned: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
        postedBy: 'Secretary',
    },
    {
        id: 'n_2',
        title: 'Diwali Celebration',
        content: 'Join us for the Grand Diwali Celebration at the Clubhouse on Oct 31st.',
        priority: 'MEDIUM',
        isPinned: false,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60000).toISOString(),
        postedBy: 'Cultural Committee',
    },
    {
        id: 'n_3',
        title: 'Lost Keys Found',
        content: 'A bunch of keys was found near Block B lift. Please collect from security.',
        priority: 'LOW',
        isPinned: false,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60000).toISOString(),
        postedBy: 'Security Chief',
    }
];
