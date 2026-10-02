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
  requirements?: string; estimatedCost?: number; status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  flat: { id: string; flatNumber: string; block?: { name: string } };
}

/**
 * Backend stores working days as short codes ("MON", "FRI"); compare on the first three
 * letters so both "FRI" and "FRIDAY" match. An empty list means every day.
 */
export function worksToday(workingDays?: string[] | null, date = new Date()) {
  if (!workingDays?.length) return true;
  const today = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase();
  return workingDays.some((day) => day.slice(0, 3).toUpperCase() === today);
}
