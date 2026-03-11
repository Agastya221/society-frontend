export interface Flat {
    id: string;
    number: string;
    block: string;
    floor: string;
    ownerName: string;
    residentsCount: number;
    vehiclesCount: number;
}

export const MOCK_FLATS: Flat[] = [
    { id: '1', number: '101', block: 'A', floor: '1', ownerName: 'Rahul Sharma', residentsCount: 3, vehiclesCount: 1 },
    { id: '2', number: '102', block: 'A', floor: '1', ownerName: 'Priya Verma', residentsCount: 2, vehiclesCount: 1 },
    { id: '3', number: '201', block: 'B', floor: '2', ownerName: 'Amit Patel', residentsCount: 4, vehiclesCount: 2 },
    { id: '4', number: '305', block: 'C', floor: '3', ownerName: 'Sneha Gupta', residentsCount: 1, vehiclesCount: 0 },
    { id: '5', number: '402', block: 'D', floor: '4', ownerName: 'Vikram Singh', residentsCount: 5, vehiclesCount: 2 },
];
