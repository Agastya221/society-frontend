import api from './api';

export interface GateLocation {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface GeofenceViolation {
  id: string;
  action: string;
  code: string;
  distanceMeters: number | null;
  createdAt: string;
  guard: { id: string; name: string | null };
}

export const listGates = async (): Promise<GateLocation[]> =>
  (await api.get('/admin/geofence/gates')).data?.data ?? [];

export const saveGateLocation = async (
  gateId: string | null,
  body: { name?: string; latitude: number; longitude: number; radiusMeters: number },
): Promise<GateLocation> => {
  const res = gateId
    ? await api.put(`/admin/geofence/gates/${gateId}`, body)
    : await api.post('/admin/geofence/gates', body);
  return res.data?.data;
};

export const clearGateLocation = async (gateId: string): Promise<void> => {
  await api.delete(`/admin/geofence/gates/${gateId}/location`);
};

export const listViolations = async (): Promise<GeofenceViolation[]> =>
  (await api.get('/admin/geofence/violations?limit=30')).data?.data ?? [];

export const VIOLATION_TEXT: Record<string, string> = {
  GEOFENCE_OUTSIDE: 'Was away from the gate',
  LOCATION_REQUIRED: 'Location was off',
  LOCATION_FAKED: 'Used a fake location',
  LOCATION_STALE: 'Location was out of date',
  LOCATION_INACCURATE: 'Location was not accurate',
  DUTY_NOT_STARTED: 'Tried to act without starting duty',
};

export interface AttendanceShift {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  endedBy: 'GUARD' | 'AUTO' | null;
  gate: string | null;
  minutes: number;
  onDuty: boolean;
  lateMinutes: number;
  earlyMinutes: number;
}

export interface AttendanceGuard {
  guardId: string;
  name: string | null;
  phone: string | null;
  daysPresent: number;
  totalMinutes: number;
  shiftCount: number;
  onDutyNow: boolean;
  scheduledShift: { name: string; startTime: string; endTime: string } | null;
  lateCount: number;
  earlyCount: number;
  shifts: AttendanceShift[];
}

export interface AttendanceReport {
  month: string;
  guards: AttendanceGuard[];
}

/** month is YYYY-MM */
export const getAttendance = async (month: string): Promise<AttendanceReport> =>
  (await api.get(`/admin/geofence/attendance?month=${month}`)).data?.data ?? { month, guards: [] };

export interface ShiftGuard {
  id: string;
  name: string | null;
  guardShiftId: string | null;
}

export interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  guards: { id: string; name: string | null }[];
}

export const listShiftsAndGuards = async (): Promise<{ shifts: ShiftItem[]; guards: ShiftGuard[] }> => {
  const data = (await api.get('/admin/geofence/shifts')).data?.data;
  return { shifts: data?.shifts ?? [], guards: data?.guards ?? [] };
};

/** Creates the shift (id null) or updates it; returns its id. */
export const saveShift = async (
  id: string | null,
  body: { name: string; startTime: string; endTime: string; graceMinutes: number },
): Promise<string> => {
  if (id) {
    await api.put(`/admin/geofence/shifts/${id}`, body);
    return id;
  }
  return (await api.post('/admin/geofence/shifts', body)).data?.data?.id;
};

export const deleteShift = async (id: string): Promise<void> => {
  await api.delete(`/admin/geofence/shifts/${id}`);
};

export const setShiftGuards = async (id: string, guardIds: string[]): Promise<void> => {
  await api.put(`/admin/geofence/shifts/${id}/guards`, { guardIds });
};
