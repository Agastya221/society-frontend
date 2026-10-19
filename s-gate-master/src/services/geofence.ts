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
};
