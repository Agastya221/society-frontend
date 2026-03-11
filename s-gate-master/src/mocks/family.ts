export type FamilyRole = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER';

export interface FamilyMember {
    id: string;
    name: string;
    role: FamilyRole;
    phone: string;
    isPrimary: boolean;
    photoUrl?: string; // placeholder
}

export const MOCK_FAMILY: FamilyMember[] = [
    {
        id: 'f_1',
        name: 'Javed Khan',
        role: 'SPOUSE',
        phone: '+91 98765 43210',
        isPrimary: true,
    },
    {
        id: 'f_2',
        name: 'Sana Khan',
        role: 'SPOUSE',
        phone: '+91 98765 12345',
        isPrimary: false,
    },
    {
        id: 'f_3',
        name: 'Ayaan Khan',
        role: 'CHILD',
        phone: '+91 98765 67890',
        isPrimary: false,
    }
];
