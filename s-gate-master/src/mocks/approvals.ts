import { ApprovalRequest } from './types';

// Helper to simulate realistic timestamps
const now = new Date();
const tenMinutesAgo = new Date(now.getTime() - 10 * 60000).toISOString();
const oneHourAgo = new Date(now.getTime() - 60 * 60000).toISOString();
const yesterday = new Date(now.getTime() - 24 * 60 * 60000).toISOString();

export const MOCK_APPROVALS: ApprovalRequest[] = [
    {
        id: 'req_1',
        visitorName: 'Rajesh Kumar',
        visitorType: 'DELIVERY',
        visitorPhotoUrl: 'https://avatar.iran.liara.run/public/boy?username=Rajesh',
        flatId: 'A-101',
        requestedAt: tenMinutesAgo,
        status: 'PENDING',
    },
    {
        id: 'req_2',
        visitorName: 'Amit Singh',
        visitorType: 'GUEST',
        visitorPhotoUrl: 'https://avatar.iran.liara.run/public/boy?username=Amit',
        flatId: 'A-101',
        requestedAt: oneHourAgo,
        status: 'APPROVED',
    },
    {
        id: 'req_3',
        visitorName: 'Urban Company',
        visitorType: 'WORKER',
        visitorPhotoUrl: 'https://avatar.iran.liara.run/public/job/plumber/male',
        flatId: 'A-101',
        requestedAt: yesterday,
        status: 'REJECTED',
        rejectionReason: 'Not at home',
    },
];
