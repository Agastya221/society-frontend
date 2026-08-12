export type StaffAvailability = 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'INACTIVE';

export interface StaffProfile {
  id: string; name: string; phone: string; staffType: string; photoUrl?: string;
  isVerified: boolean; availabilityStatus: StaffAvailability; isCurrentlyWorking: boolean;
  society: { id: string; name: string };
}

export interface StaffAssignment {
  id: string; workingDays: string[]; workStartTime?: string; workEndTime?: string;
  flat: { id: string; flatNumber: string; block?: { name: string } };
}

export interface StaffBooking {
  id: string; bookingDate: string; startTime: string; endTime: string; workType: string;
  requirements?: string; estimatedCost?: number; status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  flat: { id: string; flatNumber: string; block?: { name: string } };
}
