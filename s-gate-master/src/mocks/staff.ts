import { DomesticStaff } from './types';

const now = new Date();

export const MOCK_STAFF: DomesticStaff[] = [
    {
        id: 's_1',
        name: 'Sunita Devi',
        role: 'MAID',
        photoUrl: 'https://avatar.iran.liara.run/public/girl?username=Sunita',
        currentStatus: 'IN',
        lastEntry: new Date(now.getTime() - 30 * 60000).toISOString(),
    },
    {
        id: 's_2',
        name: 'Ramesh Yadav',
        role: 'DRIVER',
        photoUrl: 'https://avatar.iran.liara.run/public/boy?username=Ramesh',
        currentStatus: 'OUT',
        lastExit: new Date(now.getTime() - 4 * 60 * 60000).toISOString(),
    },
    {
        id: 's_3',
        name: 'Chef Vikas',
        role: 'COOK',
        photoUrl: 'https://avatar.iran.liara.run/public/boy?username=Vikas',
        currentStatus: 'OUT',
    }
];
