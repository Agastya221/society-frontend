import { SgateColors } from '../constants/Sgate-theme';

export interface TimeSlot {
  id: string;
  time: string;
  isBooked: boolean;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  colorBg: string;
  colorIcon: string;
  maxCapacity: number;
  slotDurationHours: number;
  timing: string;
  rules: string[];
  slots: TimeSlot[];
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface MyBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  amenityIcon: string;
  date: string;
  timeSlot: string;
  members: number;
  status: BookingStatus;
  bookedAt: string;
}

export const AMENITIES: Amenity[] = [
  {
    id: 'a1',
    name: 'Swimming Pool',
    icon: 'droplet',
    colorBg: SgateColors.blueBg,
    colorIcon: SgateColors.blue,
    maxCapacity: 15,
    slotDurationHours: 1,
    timing: '6:00 AM - 8:00 AM, 5:00 PM - 8:00 PM',
    rules: [
      'Carry society ID card',
      'Swimming attire mandatory',
      'No outside guests without prior approval',
      'Children below 10 must be accompanied by adults',
      'Shower before entering the pool',
    ],
    slots: [
      { id: 's1_1', time: '6:00 AM - 7:00 AM', isBooked: false },
      { id: 's1_2', time: '7:00 AM - 8:00 AM', isBooked: true },
      { id: 's1_3', time: '5:00 PM - 6:00 PM', isBooked: false },
      { id: 's1_4', time: '6:00 PM - 7:00 PM', isBooked: true },
      { id: 's1_5', time: '7:00 PM - 8:00 PM', isBooked: false },
    ],
  },
  {
    id: 'a2',
    name: 'Gymnasium',
    icon: 'zap',
    colorBg: SgateColors.redBg,
    colorIcon: SgateColors.red,
    maxCapacity: 5,
    slotDurationHours: 1,
    timing: '5:00 AM - 10:00 PM',
    rules: [
      'Carry society ID card',
      'Sports shoes mandatory',
      'Wipe equipment after use',
      'No outside guests',
      'Max 1-hour slot per booking',
    ],
    slots: [
      { id: 's2_1', time: '5:00 AM - 6:00 AM', isBooked: false },
      { id: 's2_2', time: '6:00 AM - 7:00 AM', isBooked: true },
      { id: 's2_3', time: '7:00 AM - 8:00 AM', isBooked: true },
      { id: 's2_4', time: '8:00 AM - 9:00 AM', isBooked: false },
      { id: 's2_5', time: '5:00 PM - 6:00 PM', isBooked: false },
      { id: 's2_6', time: '6:00 PM - 7:00 PM', isBooked: true },
      { id: 's2_7', time: '7:00 PM - 8:00 PM', isBooked: false },
    ],
  },
  {
    id: 'a3',
    name: 'Clubhouse',
    icon: 'home',
    colorBg: SgateColors.goldPale,
    colorIcon: SgateColors.goldDeep,
    maxCapacity: 50,
    slotDurationHours: 2,
    timing: '9:00 AM - 10:00 PM',
    rules: [
      'Booking required at least 48 hours in advance',
      'Deposit ₹2,000 refundable on clean handover',
      'No loud music after 10 PM',
      'Outside catering allowed with prior permission',
      'Clean and vacate within booked hours',
    ],
    slots: [
      { id: 's3_1', time: '9:00 AM - 11:00 AM', isBooked: false },
      { id: 's3_2', time: '11:00 AM - 1:00 PM', isBooked: true },
      { id: 's3_3', time: '2:00 PM - 4:00 PM', isBooked: false },
      { id: 's3_4', time: '4:00 PM - 6:00 PM', isBooked: false },
      { id: 's3_5', time: '6:00 PM - 8:00 PM', isBooked: true },
      { id: 's3_6', time: '8:00 PM - 10:00 PM', isBooked: false },
    ],
  },
  {
    id: 'a4',
    name: 'Badminton Court',
    icon: 'activity',
    colorBg: SgateColors.greenBg,
    colorIcon: SgateColors.green,
    maxCapacity: 4,
    slotDurationHours: 1,
    timing: '6:00 AM - 10:00 PM',
    rules: [
      'Sports shoes mandatory',
      'Shuttlecocks available at security desk (₹50 each)',
      'Max 1-hour slot per booking',
      'Cancel at least 2 hours in advance',
    ],
    slots: [
      { id: 's4_1', time: '6:00 AM - 7:00 AM', isBooked: true },
      { id: 's4_2', time: '7:00 AM - 8:00 AM', isBooked: false },
      { id: 's4_3', time: '8:00 AM - 9:00 AM', isBooked: false },
      { id: 's4_4', time: '5:00 PM - 6:00 PM', isBooked: true },
      { id: 's4_5', time: '6:00 PM - 7:00 PM', isBooked: false },
      { id: 's4_6', time: '7:00 PM - 8:00 PM', isBooked: true },
      { id: 's4_7', time: '8:00 PM - 9:00 PM', isBooked: false },
      { id: 's4_8', time: '9:00 PM - 10:00 PM', isBooked: false },
    ],
  },
  {
    id: 'a5',
    name: 'Kids Play Area',
    icon: 'smile',
    colorBg: '#FFF0E5',
    colorIcon: '#FF8C42',
    maxCapacity: 20,
    slotDurationHours: 1,
    timing: '7:00 AM - 7:00 PM',
    rules: [
      'Children below 5 must be accompanied by adults',
      'No food or drinks inside the play area',
      'Report any damaged equipment immediately',
      'Be respectful of other children',
    ],
    slots: [
      { id: 's5_1', time: '7:00 AM - 8:00 AM', isBooked: false },
      { id: 's5_2', time: '10:00 AM - 11:00 AM', isBooked: false },
      { id: 's5_3', time: '4:00 PM - 5:00 PM', isBooked: true },
      { id: 's5_4', time: '5:00 PM - 6:00 PM', isBooked: false },
      { id: 's5_5', time: '6:00 PM - 7:00 PM', isBooked: false },
    ],
  },
  {
    id: 'a6',
    name: 'Terrace Garden',
    icon: 'feather',
    colorBg: SgateColors.greenBg,
    colorIcon: '#2D8A5A',
    maxCapacity: 10,
    slotDurationHours: 1,
    timing: '6:00 AM - 9:00 PM',
    rules: [
      'No littering',
      'No loud music',
      'Pets allowed on leash only',
      'Do not damage plants or furniture',
    ],
    slots: [
      { id: 's6_1', time: '6:00 AM - 7:00 AM', isBooked: false },
      { id: 's6_2', time: '7:00 AM - 8:00 AM', isBooked: false },
      { id: 's6_3', time: '5:00 PM - 6:00 PM', isBooked: true },
      { id: 's6_4', time: '6:00 PM - 7:00 PM', isBooked: false },
      { id: 's6_5', time: '7:00 PM - 8:00 PM', isBooked: false },
      { id: 's6_6', time: '8:00 PM - 9:00 PM', isBooked: false },
    ],
  },
];

export const MY_BOOKINGS: MyBooking[] = [
  {
    id: 'b1',
    amenityId: 'a2',
    amenityName: 'Gymnasium',
    amenityIcon: 'zap',
    date: '2026-03-25',
    timeSlot: '6:00 AM - 7:00 AM',
    members: 1,
    status: 'CONFIRMED',
    bookedAt: new Date().toISOString(),
  },
  {
    id: 'b2',
    amenityId: 'a1',
    amenityName: 'Swimming Pool',
    amenityIcon: 'droplet',
    date: '2026-03-26',
    timeSlot: '6:00 PM - 7:00 PM',
    members: 3,
    status: 'CONFIRMED',
    bookedAt: new Date().toISOString(),
  },
  {
    id: 'b3',
    amenityId: 'a4',
    amenityName: 'Badminton Court',
    amenityIcon: 'activity',
    date: '2026-03-20',
    timeSlot: '7:00 AM - 8:00 AM',
    members: 4,
    status: 'COMPLETED',
    bookedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'b4',
    amenityId: 'a3',
    amenityName: 'Clubhouse',
    amenityIcon: 'home',
    date: '2026-03-15',
    timeSlot: '6:00 PM - 8:00 PM',
    members: 20,
    status: 'CANCELLED',
    bookedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
