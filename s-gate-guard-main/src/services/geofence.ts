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
