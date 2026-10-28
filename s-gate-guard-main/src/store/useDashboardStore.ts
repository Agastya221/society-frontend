import { create } from 'zustand';
import type { Duty, GeofenceStatus } from '@/services/geofence';

export interface DashboardState {
  pendingCount: number;
  readyCount: number;
  stoppedCount: number;
  insideCount: number;
  offline: boolean;
  geo: GeofenceStatus | null;
  /** undefined = unknown, null = off duty, Duty = on duty */
  duty: Duty | null | undefined;

  setPendingCount: (count: number) => void;
  setReadyCount: (count: number) => void;
  setStoppedCount: (count: number) => void;
  setInsideCount: (count: number) => void;
  setOffline: (offline: boolean) => void;
  setGeo: (geo: GeofenceStatus | null) => void;
  setDuty: (duty: Duty | null | undefined) => void;
  setCounts: (counts: {
    pendingCount: number;
    readyCount: number;
    stoppedCount: number;
    insideCount: number;
  }) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  pendingCount: 0,
  readyCount: 0,
  stoppedCount: 0,
  insideCount: 0,
  offline: false,
  geo: null,
  duty: undefined,

  setPendingCount: (pendingCount) => set({ pendingCount }),
  setReadyCount: (readyCount) => set({ readyCount }),
  setStoppedCount: (stoppedCount) => set({ stoppedCount }),
  setInsideCount: (insideCount) => set({ insideCount }),
  setOffline: (offline) => set({ offline }),
  setGeo: (geo) => set({ geo }),
  setDuty: (duty) => set({ duty }),
  setCounts: ({ pendingCount, readyCount, stoppedCount, insideCount }) =>
    set({ pendingCount, readyCount, stoppedCount, insideCount }),
  reset: () =>
    set({
      pendingCount: 0,
      readyCount: 0,
      stoppedCount: 0,
      insideCount: 0,
      offline: false,
      geo: null,
      duty: undefined,
    }),
}));
