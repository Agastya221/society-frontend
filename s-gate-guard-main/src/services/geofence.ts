import api from './api';

export interface GeofenceStatus {
  /** false = this society has not set a gate location, nothing is checked */
  enforced: boolean;
  ok: boolean;
  code?: 'LOCATION_REQUIRED' | 'LOCATION_FAKED' | 'LOCATION_STALE' | 'LOCATION_INACCURATE' | 'GEOFENCE_OUTSIDE';
  message?: string;
  distanceMeters?: number;
  gateName?: string;
}

/** Asks the server whether this phone is at the gate right now (the app's location is attached by the api layer). */
export async function fetchGeofence(): Promise<GeofenceStatus> {
  const res = await api.get('/api/v1/guard/geofence/status');
  return res.data?.data ?? { enforced: false, ok: true };
}

export interface Duty {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

/** undefined = the server did not say (older server); null = off duty; object = on duty */
export async function fetchDuty(): Promise<Duty | null | undefined> {
  const res = await api.get('/api/v1/guard/duty');
  const data = res.data?.data;
  return data && 'duty' in data ? (data.duty as Duty | null) : undefined;
}

export async function startDuty(): Promise<Duty | null> {
  const res = await api.post('/api/v1/guard/duty/start', {});
  return res.data?.data?.duty ?? null;
}

export async function endDuty(): Promise<void> {
  await api.post('/api/v1/guard/duty/end', {});
}
