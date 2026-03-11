export interface Gate {
    id: string;
    name: string;
    active: boolean;
    guardsAssigned: number;
}

export const MOCK_GATES: Gate[] = [
    { id: '1', name: 'Main Gate (Entry)', active: true, guardsAssigned: 3 },
    { id: '2', name: 'Main Gate (Exit)', active: true, guardsAssigned: 2 },
    { id: '3', name: 'Back Gate', active: false, guardsAssigned: 0 },
];
