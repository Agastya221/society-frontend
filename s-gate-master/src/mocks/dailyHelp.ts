export interface DailyHelper {
  id: string;
  name: string;
  type: string;
  photoUrl?: string;
  rating: number;
  housesCount: number;
  isInside: boolean;
  isOpenToWork: boolean;
  attendanceScore: string;
  yearsInSociety: number;
  ratings: { label: string; count: number }[];
  worksIn: { flat: string; duration: string }[];
  phone: string;
}

export interface DailyHelpType {
  type: string;
  label: string;
  count: number;
  icon: string;
}

export const DAILY_HELP_TYPES: DailyHelpType[] = [
  { type: 'MAID', label: 'Maid', count: 263, icon: 'home' },
  { type: 'COOK', label: 'Cook', count: 61, icon: 'coffee' },
  { type: 'DRIVER', label: 'Driver', count: 13, icon: 'truck' },
  { type: 'MILKMAN', label: 'Milkman', count: 21, icon: 'droplet' },
  { type: 'PAPERBOY', label: 'Paperboy', count: 2, icon: 'file-text' },
  { type: 'CAR_CLEANER', label: 'Car Cleaner', count: 23, icon: 'wind' },
  { type: 'NANNY', label: 'Nanny', count: 2, icon: 'heart' },
  { type: 'TUITION_TEACHER', label: 'Tuition Teacher', count: 13, icon: 'book-open' },
  { type: 'SKATING_INSTRUCTOR', label: 'Skating Instructor', count: 2, icon: 'activity' },
  { type: 'ELDERLY_CARETAKER', label: 'Elderly Caretaker', count: 15, icon: 'user' },
  { type: 'LAUNDRY', label: 'Laundry', count: 13, icon: 'loader' },
];

export const DAILY_HELPERS: DailyHelper[] = [
  // MAIDS
  {
    id: 'dh_1', name: 'Savita Devi', type: 'MAID', rating: 4.8, housesCount: 7,
    isInside: true, isOpenToWork: true, attendanceScore: '27/30', yearsInSociety: 4,
    phone: 'XXXXXXX2762',
    ratings: [
      { label: 'Very Punctual', count: 4 },
      { label: 'Quite Regular', count: 3 },
      { label: 'Exceptional Service', count: 5 },
      { label: 'Great Attitude', count: 4 },
    ],
    worksIn: [
      { flat: 'A-101', duration: '4 years' },
      { flat: 'A-203', duration: '2 years' },
      { flat: 'B-304', duration: '1 year' },
      { flat: 'C-102', duration: '3 years' },
    ],
  },
  {
    id: 'dh_2', name: 'Kamla Bai', type: 'MAID', rating: 4.5, housesCount: 5,
    isInside: false, isOpenToWork: true, attendanceScore: '21/30', yearsInSociety: 2,
    phone: 'XXXXXXX8834',
    ratings: [
      { label: 'Very Punctual', count: 3 },
      { label: 'Quite Regular', count: 2 },
      { label: 'Exceptional Service', count: 3 },
      { label: 'Great Attitude', count: 2 },
    ],
    worksIn: [
      { flat: 'D-201', duration: '2 years' },
      { flat: 'E-102', duration: '1 year' },
    ],
  },
  {
    id: 'dh_3', name: 'Rekha Singh', type: 'MAID', rating: 4.9, housesCount: 8,
    isInside: true, isOpenToWork: false, attendanceScore: '29/30', yearsInSociety: 6,
    phone: 'XXXXXXX4451',
    ratings: [
      { label: 'Very Punctual', count: 7 },
      { label: 'Quite Regular', count: 8 },
      { label: 'Exceptional Service', count: 6 },
      { label: 'Great Attitude', count: 7 },
    ],
    worksIn: [
      { flat: 'A-401', duration: '6 years' },
      { flat: 'B-201', duration: '4 years' },
      { flat: 'C-303', duration: '3 years' },
    ],
  },
  {
    id: 'dh_4', name: 'Meena Kumari', type: 'MAID', rating: 4.2, housesCount: 4,
    isInside: false, isOpenToWork: true, attendanceScore: '18/30', yearsInSociety: 1,
    phone: 'XXXXXXX6679',
    ratings: [
      { label: 'Very Punctual', count: 2 },
      { label: 'Quite Regular', count: 1 },
      { label: 'Exceptional Service', count: 2 },
      { label: 'Great Attitude', count: 3 },
    ],
    worksIn: [
      { flat: 'F-101', duration: '1 year' },
      { flat: 'G-204', duration: '8 months' },
    ],
  },
  // COOKS
  {
    id: 'dh_5', name: 'Sunita Sharma', type: 'COOK', rating: 4.7, housesCount: 4,
    isInside: true, isOpenToWork: true, attendanceScore: '25/30', yearsInSociety: 3,
    phone: 'XXXXXXX3321',
    ratings: [
      { label: 'Very Punctual', count: 3 },
      { label: 'Quite Regular', count: 4 },
      { label: 'Exceptional Service', count: 4 },
      { label: 'Great Attitude', count: 3 },
    ],
    worksIn: [
      { flat: 'A-202', duration: '3 years' },
      { flat: 'B-105', duration: '2 years' },
    ],
  },
  {
    id: 'dh_6', name: 'Geeta Devi', type: 'COOK', rating: 4.6, housesCount: 3,
    isInside: false, isOpenToWork: true, attendanceScore: '22/30', yearsInSociety: 2,
    phone: 'XXXXXXX7743',
    ratings: [
      { label: 'Very Punctual', count: 2 },
      { label: 'Quite Regular', count: 3 },
      { label: 'Exceptional Service', count: 3 },
      { label: 'Great Attitude', count: 2 },
    ],
    worksIn: [
      { flat: 'C-401', duration: '2 years' },
      { flat: 'D-303', duration: '1 year' },
    ],
  },
  // DRIVERS
  {
    id: 'dh_7', name: 'Raju Prasad', type: 'DRIVER', rating: 4.3, housesCount: 2,
    isInside: true, isOpenToWork: false, attendanceScore: '20/30', yearsInSociety: 5,
    phone: 'XXXXXXX9912',
    ratings: [
      { label: 'Very Punctual', count: 1 },
      { label: 'Quite Regular', count: 2 },
      { label: 'Exceptional Service', count: 1 },
      { label: 'Great Attitude', count: 2 },
    ],
    worksIn: [
      { flat: 'E-502', duration: '5 years' },
    ],
  },
  {
    id: 'dh_8', name: 'Vijay Kumar', type: 'DRIVER', rating: 4.8, housesCount: 1,
    isInside: false, isOpenToWork: true, attendanceScore: '28/30', yearsInSociety: 3,
    phone: 'XXXXXXX5567',
    ratings: [
      { label: 'Very Punctual', count: 3 },
      { label: 'Quite Regular', count: 2 },
      { label: 'Exceptional Service', count: 3 },
      { label: 'Great Attitude', count: 2 },
    ],
    worksIn: [
      { flat: 'F-601', duration: '3 years' },
    ],
  },
  // MILKMAN
  {
    id: 'dh_9', name: 'Bhola Yadav', type: 'MILKMAN', rating: 4.9, housesCount: 15,
    isInside: true, isOpenToWork: false, attendanceScore: '30/30', yearsInSociety: 8,
    phone: 'XXXXXXX1123',
    ratings: [
      { label: 'Very Punctual', count: 14 },
      { label: 'Quite Regular', count: 15 },
      { label: 'Exceptional Service', count: 13 },
      { label: 'Great Attitude', count: 12 },
    ],
    worksIn: [
      { flat: 'Multiple flats', duration: '8 years' },
    ],
  },
  // CAR CLEANER
  {
    id: 'dh_10', name: 'Santosh Pandey', type: 'CAR_CLEANER', rating: 4.5, housesCount: 10,
    isInside: true, isOpenToWork: true, attendanceScore: '24/30', yearsInSociety: 2,
    phone: 'XXXXXXX6688',
    ratings: [
      { label: 'Very Punctual', count: 8 },
      { label: 'Quite Regular', count: 9 },
      { label: 'Exceptional Service', count: 7 },
      { label: 'Great Attitude', count: 9 },
    ],
    worksIn: [
      { flat: 'Parking B2', duration: '2 years' },
    ],
  },
];
