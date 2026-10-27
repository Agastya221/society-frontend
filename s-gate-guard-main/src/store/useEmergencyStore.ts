import { create } from 'zustand';

export interface ActiveEmergency {
  id: string;
  type: string;
  description?: string | null;
  location?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  reportedBy?: { id?: string; name?: string; phone?: string } | null;
  flat?: { flatNumber?: string } | null;
}

interface EmergencyState {
  /** Emergencies of this society that nobody has resolved yet, as last fetched from the server */
  active: ActiveEmergency[];
  setActive: (active: ActiveEmergency[]) => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  active: [],
  setActive: (active) => set({ active }),
}));
