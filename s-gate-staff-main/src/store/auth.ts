import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { StaffProfile } from '../types/staff';

// Kept here (not imported from services/api) to avoid an api <-> store import cycle.
const STAFF_API_URL = 'https://society-gate-backend-gsrq.onrender.com/api/v1';

type AuthStore = {
  ready: boolean; token: string | null; staff: StaffProfile | null;
  hydrate: () => Promise<void>;
  signIn: (accessToken: string, refreshToken: string, staff: StaffProfile) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthStore>((set) => ({
  ready: false, token: null, staff: null,
  hydrate: async () => {
    const [token, raw] = await Promise.all([
      SecureStore.getItemAsync('staff_access_token'),
      SecureStore.getItemAsync('staff_profile'),
    ]);
    set({ token, staff: raw ? JSON.parse(raw) : null, ready: true });
  },
  signIn: async (accessToken, refreshToken, staff) => {
    await Promise.all([
      SecureStore.setItemAsync('staff_access_token', accessToken),
      SecureStore.setItemAsync('staff_refresh_token', refreshToken),
      SecureStore.setItemAsync('staff_profile', JSON.stringify(staff)),
    ]);
    set({ token: accessToken, staff });
  },
  signOut: async () => {
    // Revoke the session server-side too (clears the refresh token and FCM token),
    // otherwise pushes keep arriving on a signed-out device. Best effort only.
    const accessToken = await SecureStore.getItemAsync('staff_access_token');
    if (accessToken) {
      fetch(`${STAFF_API_URL}/staff-app/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
    }
    await Promise.all(['staff_access_token', 'staff_refresh_token', 'staff_profile'].map((key) => SecureStore.deleteItemAsync(key)));
    set({ token: null, staff: null });
  },
}));
