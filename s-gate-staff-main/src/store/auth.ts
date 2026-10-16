import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { API_URL } from '../constants/api';
import { StaffProfile } from '../types/staff';

const LOGOUT_TIMEOUT_MS = 15000;

/**
 * Revoke the session server-side (clears the refresh token and FCM token) so pushes
 * stop on a signed-out device. The refresh token is sent too, so this still works
 * when the access token has already expired. Best effort, capped at 15 s.
 */
function revokeOnServer(accessToken: string | null, refreshToken: string | null): void {
  if (!accessToken && !refreshToken) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);
  fetch(`${API_URL}/staff-app/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    signal: controller.signal,
  }).catch(() => undefined).finally(() => clearTimeout(timer));
}

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
    // Local sign-out never waits on (or fails because of) the server call.
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync('staff_access_token').catch(() => null),
      SecureStore.getItemAsync('staff_refresh_token').catch(() => null),
    ]);
    revokeOnServer(accessToken, refreshToken);
    await Promise.all(['staff_access_token', 'staff_refresh_token', 'staff_profile'].map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
    set({ token: null, staff: null });
  },
}));
