import { Complaint, ComplaintCategory, ComplaintPriority } from './types';

const now = new Date();

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = ['Plumbing', 'Electrical', 'Security', 'Cleanliness', 'Other'];
export const COMPLAINT_PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const MOCK_COMPLAINTS: Complaint[] = [
    {
        id: 'c_1',
        title: 'Major Leak in Master Bath',
        category: 'Plumbing',
        description: 'Water leakage in the master bedroom bathroom ceiling. It is dripping constantly.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        flatNumber: 'A-101',
        createdBy: 'Alice Johnson',
        images: [
            'https://plus.unsplash.com/premium_photo-1663126298656-33616be83c32?q=80&w=2940&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=2940&auto=format&fit=crop'
        ],
        comments: [
            {
                id: 'cm_1',
                author: 'Admin',
                role: 'ADMIN',
                message: 'We have assigned a plumber. They will visit by 2 PM.',
                createdAt: new Date(now.getTime() - 1 * 60 * 60000).toISOString(),
            },
            {
                id: 'cm_2',
                author: 'Alice Johnson',
                role: 'RESIDENT',
                message: 'Thank you, please ensure they call before coming.',
                createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
            }
        ],
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
        likes: 5,
        likedBy: ['u_2', 'u_3', 'u_4', 'u_5', 'u_6'],
    },
    {
        id: 'c_2',
        title: 'Flickering Lights in Corridor',
        category: 'Electrical',
        description: 'Corridor light is flickering near A-101. It is very annoying at night.',
        priority: 'MEDIUM',
        status: 'OPEN',
        flatNumber: 'A-101',
        createdBy: 'Alice Johnson',
        images: [],
        comments: [],
        createdAt: new Date(now.getTime() - 4 * 60 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 4 * 60 * 60000).toISOString(),
        likes: 0,
        likedBy: [],
    },
    {
        id: 'c_3',
        title: 'Unauthorized Parking',
        category: 'Security',
        description: 'Someone parked in my slot A-101. Vehicle number KA-01-AB-1234.',
        priority: 'URGENT',
        status: 'RESOLVED',
        flatNumber: 'A-101',
        createdBy: 'Alice Johnson',
        images: ['https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=2940&auto=format&fit=crop'],
        comments: [
            {
                id: 'cm_3',
                author: 'Admin',
                role: 'ADMIN',
                message: 'Security has been alerted. The vehicle has been clamped.',
                createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60000).toISOString(),
            }
        ],
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60000).toISOString(),
        updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60000).toISOString(),
        likes: 12,
        likedBy: ['u_1', 'u_2', 'u_3', 'u_4', 'u_5', 'u_6', 'u_7', 'u_8', 'u_9', 'u_10', 'u_11', 'u_12'],
    }
];
