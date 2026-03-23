export type VehicleType = 'CAR' | 'BIKE' | 'OTHER';
export type VehicleStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export interface Vehicle {
  id: string;
  type: VehicleType;
  number: string;
  make: string;
  model: string;
  color: string;
  year: number;
  status: VehicleStatus;
  stickerIssued: boolean;
  registeredAt: string;
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    type: 'CAR',
    number: 'MH 01 AB 1234',
    make: 'Maruti Suzuki',
    model: 'Swift',
    color: 'White',
    year: 2022,
    status: 'ACTIVE',
    stickerIssued: true,
    registeredAt: '2024-06-15T10:30:00Z',
  },
  {
    id: 'v2',
    type: 'BIKE',
    number: 'MH 01 XY 9876',
    make: 'Honda',
    model: 'Activa 6G',
    color: 'Pearl Siren Blue',
    year: 2023,
    status: 'PENDING',
    stickerIssued: false,
    registeredAt: '2026-03-10T09:00:00Z',
  },
];
